import { Router } from 'express';
import Rfp from '../models/Rfp.js';
import Vendor from '../models/Vendor.js';
import Proposal from '../models/Proposal.js';
import { generateRfpFromText } from '../services/openai.js';
import { sendRfpEmails } from '../services/email.js';

const router = Router();

router.get('/', async (req, res) => {
  const list = await Rfp.find().sort({ createdAt: -1 });
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const rfp = await Rfp.findById(req.params.id).populate('vendorIds');
  const proposals = await Proposal.find({ rfpId: req.params.id }).populate('vendorId');
  res.json({ rfp, proposals });
});

router.post('/ai', async (req, res) => {
  try {
    const { text } = req.body;
    const rfpJson = await generateRfpFromText(text || '');
    const rfp = await Rfp.create(rfpJson);
    res.json(rfp);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id/vendors', async (req, res) => {
  const { vendorIds } = req.body;
  const rfp = await Rfp.findByIdAndUpdate(
    req.params.id,
    { vendorIds },
    { new: true }
  ).populate('vendorIds');
  res.json(rfp);
});

router.post('/:id/send', async (req, res) => {
  try {
    const rfp = await Rfp.findById(req.params.id);
    const vendors = await Vendor.find({ _id: { $in: rfp.vendorIds } });
    await sendRfpEmails(rfp, vendors);
    await Rfp.findByIdAndUpdate(rfp._id, { status: 'sent' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
