import { Router } from 'express';
import Rfp from '../models/Rfp.js';
import Proposal from '../models/Proposal.js';
import Vendor from '../models/Vendor.js';
import { compareProposals } from '../services/openai.js';

const router = Router();

router.get('/:rfpId', async (req, res) => {
  const rfp = await Rfp.findById(req.params.rfpId);
  const proposals = await Proposal.find({ rfpId: rfp._id }).populate('vendorId');
  const minimal = proposals.map(p => ({
    vendorName: p.vendorId?.name,
    totalPrice: p.totalPrice,
    terms: p.terms,
    delivery: p.delivery,
    warranty: p.warranty,
    paymentTerms: p.paymentTerms,
    aiSummary: p.aiSummary
  }));
  const ai = await compareProposals(rfp.toObject(), minimal);
  res.json(ai);
});

export default router;
