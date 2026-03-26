import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  status: { type: String, default: 'Pending' },
  upvotes: { type: Number, default: 0 }
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
