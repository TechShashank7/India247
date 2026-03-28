import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  trackingId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  imageUrl: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  status: { type: String, default: 'Pending' },
  escalationLevel: { type: Number, default: 1 },
  stage: { type: String, default: 'Complaint Filed' },
  timeline: [
    {
      stage: String,
      time: { type: Date, default: Date.now }
    }
  ],
  reopen: {
    isReopened: { type: Boolean, default: false },
    reason: String,
    image: String,
    count: { type: Number, default: 0 }
  },
  upvotes: { type: Number, default: 0 },
  rating: {
    value: { type: Number, min: 1, max: 5 },
    given: { type: Boolean, default: false }
  },
  assignedOfficer: {
    uid: String, 
    name: { type: String, default: "Officer Sharma" },
    department: { type: String, default: "Civil Department" }
  },
  user: {
    name: String,
    uid: String   // keep empty for now
  },
  comments: [
    {
      text: String,
      userName: String,
      userId: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  shares: { type: Number, default: 0 }
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
