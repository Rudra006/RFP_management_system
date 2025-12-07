import nodemailer from 'nodemailer';

export function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE || 'false') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

export async function sendRfpEmails(rfp, vendors) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM;
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const replyTo = process.env.IMAP_USER || from;

  const token = `RFPID:${rfp._id}`;
  const subject = `RFP: ${rfp.title} [${token}]`;
  const body = `Hello,\n\nPlease find below the RFP details. Reply with your proposal.\n\nTitle: ${rfp.title}\nBudget: ${rfp.budget}\nDelivery: ${rfp.delivery_timeline}\nPayment Terms: ${rfp.payment_terms}\nWarranty: ${rfp.warranty}\n\nItems:\n${(rfp.items||[]).map(i=>`- ${i.name} x${i.quantity} (${i.specs||''})`).join('\n')}\n\nYou can view context: ${baseUrl}\n\nReference Token: [${token}]\nPlease keep this token in the subject when replying.\n\nThanks.`;

  for (const v of vendors) {
    await transporter.sendMail({ from, replyTo, to: v.email, subject, text: body });
  }
}
