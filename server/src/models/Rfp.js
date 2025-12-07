import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema(
  {
    name: String,
    quantity: Number,
    specs: String
  },
  { _id: false }
);

const RfpSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    budget: Number,
    delivery_timeline: String,
    items: [ItemSchema],
    payment_terms: String,
    warranty: String,
    vendorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    status: { type: String, default: 'draft' }
  },
  { timestamps: true }
);

export default mongoose.model('Rfp', RfpSchema);
