import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model('Vendor', VendorSchema);
