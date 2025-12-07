import { Router } from 'express';
import { fetchVendorResponsesForRfp } from '../services/imap.js';

const router = Router();

router.post('/fetch/:rfpId', async (req, res) => {
  try {
    const proposals = await fetchVendorResponsesForRfp(req.params.rfpId);
    res.json({ count: proposals.length, proposals });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
