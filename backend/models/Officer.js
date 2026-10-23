import mongoose from 'mongoose';

const officerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  region: { type: String, required: true },
  uid: { type: String, default: null }, // Maps to Firebase User UID
  isActive: { type: Boolean, default: true },
  designation: { type: String, required: true },
  currentLoad: { type: Number, default: 0 },
  resolvedComplaints: { type: Number, default: 0 },
  reopenedComplaints: { type: Number, default: 0 },
  trustScore: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now },
  avgResolutionTime: { type: Number, default: 0 }, // in hours
  active: { type: Boolean, default: true }
}, { timestamps: true });

const Officer = mongoose.model('Officer', officerSchema);

export default Officer;
