import { Router } from 'express';
import Vendor from '../models/Vendor.js';

const router = Router();

router.get('/', async (req, res) => {
  const list = await Vendor.find().sort({ createdAt: -1 });
  res.json(list);
});

router.post('/', async (req, res) => {
  try {
    const v = await Vendor.create(req.body);
    res.json(v);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  await Vendor.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
