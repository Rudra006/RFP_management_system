import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import Vendor from '../models/Vendor.js';
import Proposal from '../models/Proposal.js';
import Rfp from '../models/Rfp.js';
import { parseVendorEmail } from './openai.js';

export async function fetchVendorResponsesForRfp(rfpId) {
  const rfp = await Rfp.findById(rfpId);
  if (!rfp) throw new Error('RFP not found');

  const { IMAP_HOST, IMAP_PORT, IMAP_SECURE, IMAP_USER, IMAP_PASS, IMAP_MAILBOX = 'INBOX' } = process.env;
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT || 993),
    secure: String(IMAP_SECURE || 'true') === 'true',
    auth: { user: IMAP_USER, pass: IMAP_PASS }
  });

  await client.connect();
  await client.mailboxOpen(IMAP_MAILBOX, { readOnly: false });

  // Prefer an immutable token embedded in subject/body. Fallback to title match.
  const token = `RFPID:${rfp._id}`;
  const subjectNeedle = rfp.title || '';
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // last 90 days

  const lock = await client.getMailboxLock(IMAP_MAILBOX);
  try {
    // First try finding by token in subject/body; then fallback to title in subject
    const byTokenSubject = await client.search({ subject: token, since });
    const byTokenBody = await client.search({ body: token, since });
    const byTitle = await client.search({ subject: subjectNeedle, since });
    //  const byTitle = await client.search({ subject: subjectNeedle, since }, { uid: true });
  console.log("all extracted data is byTokenSubject",byTokenSubject);
    console.log("all extracted data is byTokenBody",byTokenBody);
    console.log("all extracted data is byTitle",byTitle);
    // Merge and de-duplicate UIDs
    const uidSet = new Set([...(byTokenSubject||[]), ...(byTokenBody||[]), ...(byTitle||[])]);
    const uids = Array.from(uidSet);
    console.log("all extracted data is uid",uidSet);
    console.log("all extracted data is vid",rfp.vendorIds);
    const vendors = await Vendor.find({ _id: { $in: rfp.vendorIds } });
    console.log("all extracted data is v",vendors);
    const vendorIds = new Set(vendors.map(v => String(v._id)));
    const vendorMeta = vendors.map(v => ({ id: v._id, name: (v.name||'').toLowerCase().trim(), email: (v.email || '').toLowerCase().trim() }));

    const created = [];

    // Use fetch to stream messages safely
    for await (const msg of client.fetch(uids, { uid: true, source: true, envelope: true })) {
      try {
        console.log("all extracted data is msg",msg.uid);
        const uid = msg.uid;
        const parsed = await simpleParser(msg.source);
        const subj = parsed.subject || '';
        const html = parsed.html || '';
        const text = parsed.text || '';
        console.log("all extracted data is 3",subj );
        // Extract sender addresses robustly
        const fromList = Array.isArray(parsed.from?.value) ? parsed.from.value : [];
        const fromAddresses = fromList.map(f => (f.address || '').toLowerCase().trim()).filter(Boolean);
        const fromNames = fromList.map(f => (f.name || '').toLowerCase().trim()).filter(Boolean);

        // If vendor token present, attribute directly
        const vendorTokenMatch = (subj + ' ' + html + ' ' + text).match(/VENDORID:([a-fA-F0-9]{24})/);
        let vendorMatch = null;
        if (vendorTokenMatch) {
          console.log("all extracted data is 2",vendorTokenMatch);
          const vid = vendorTokenMatch[1].toLowerCase();
          vendorMatch = vendorMeta.find(v => String(v.id).toLowerCase() === vid);
        }

        // Otherwise, match against known vendors by exact email OR by display name contain vendor.name
        if (!vendorMatch) vendorMatch = vendorMeta.find(v =>
          (v.email && fromAddresses.includes(v.email)) ||
          (v.name && fromNames.some(n => n.includes(v.name)))
        );
        // If not matched by email/name but token is present and relaxed mode is enabled, try heuristics
        const allowRelaxed = String(process.env.IMAP_ALLOW_ANY_SENDER_FOR_TOKEN || 'false') === 'true';
        const tokenPresent = subj.includes(token) || html.includes(token) || text.includes(token);
        if (!vendorMatch && allowRelaxed && tokenPresent) {
          console.log("all extracted data is 1",allowRelaxed);
          // Heuristic 1: if exactly one vendor is selected on this RFP, use it
          if (vendorMeta.length === 1) {
            vendorMatch = vendorMeta[0];
          } else {
            // Heuristic 2: try unique domain match
            const addr = fromAddresses[0] || '';
            const senderDomain = addr.includes('@') ? addr.split('@').pop() : '';
            const candidates = vendorMeta.filter(v => (v.email.split('@').pop() || '') === senderDomain);
            if (candidates.length === 1) {
              vendorMatch = candidates[0];
            }
          }
        }
        if (!vendorMatch) {
          continue; // still cannot safely attribute
        }

        // Build a text body: prefer parsed.text, fallback to stripped HTML
        const htmlContent = html;
        const stripped = htmlContent ? htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        const bodyText = (text && text.trim()) || stripped;
        const emailText = `${parsed.subject || ''}\n\n${bodyText || ''}`.trim();
        console.log("all extracted data is", emailText);
        const ai = await parseVendorEmail(rfp.toObject(), emailText);

        const proposal = await Proposal.findOneAndUpdate(
          { rfpId: rfp._id, vendorId: vendorMatch.id },
          {
            pricingItems: Array.isArray(ai.pricingItems) ? ai.pricingItems : [],
            totalPrice: Number(ai.totalPrice) || 0,
            terms: ai.terms || '',
            delivery: ai.delivery || '',
            warranty: ai.warranty || '',
            paymentTerms: ai.paymentTerms || '',
            rawEmailId: String(uid),
            raw: { subject: parsed.subject, from: fromAddresses, text: parsed.text },
            aiSummary: ai.aiSummary || ''
          },
          { new: true, upsert: true }
        );
        created.push(proposal);
      } catch (msgErr) {
        // Skip problematic messages but keep processing others
        // Optionally could log
        console.log("all extracted data is err", msgErr)
        continue;
      }
    }

    return created;
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
}
