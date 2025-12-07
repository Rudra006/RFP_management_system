import mongoose from 'mongoose';

const PricingItemSchema = new mongoose.Schema(
  {
    itemName: String,
    unitPrice: Number,
    quantity: Number,
    total: Number
  },
  { _id: false }
);

const ProposalSchema = new mongoose.Schema(
  {
    rfpId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfp', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    pricingItems: [PricingItemSchema],
    totalPrice: Number,
    terms: String,
    delivery: String,
    warranty: String,
    paymentTerms: String,
    rawEmailId: String,
    raw: Object,
    aiSummary: String,
    aiScore: Number
  },
  { timestamps: true }
);

export default mongoose.model('Proposal', ProposalSchema);
