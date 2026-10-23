import express from 'express';
import Complaint from '../models/Complaint.js';
import Officer from '../models/Officer.js';
import { requireAuth, requireOfficer } from '../middleware/auth.js';
import multer from 'multer';
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "resolution_proofs",
    allowed_formats: ["jpg", "png", "webp"],
  },
});

const upload = multer({ storage });

router.use(requireAuth);
router.use(requireOfficer);

// Get my officer profile
router.get('/me', (req, res) => {
  res.json(req.officer);
});

// Get my assigned complaints
router.get('/my-complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find({ officerId: req.officer._id })
      .populate('departmentId')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my metrics
router.get('/my-metrics', async (req, res) => {
  try {
    const complaints = await Complaint.find({ officerId: req.officer._id });
    
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    const reopened = complaints.filter(c => c.reopen?.isReopened).length;
    
    const ratings = complaints.filter(c => c.rating?.given).map(c => c.rating.value);
    const citizenRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
    
    res.json({
      currentLoad: req.officer.currentLoad,
      resolvedComplaints: req.officer.resolvedComplaints,
      reopenedComplaints: req.officer.reopenedComplaints,
      trustScore: req.officer.trustScore,
      citizenRating,
      avgResolutionTime: req.officer.avgResolutionTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint progress (Pending -> In Progress, etc.)
router.put('/complaints/:id/progress', async (req, res) => {
  try {
    const { status, stage } = req.body;
    
    const complaint = await Complaint.findOne({ _id: req.params.id, officerId: req.officer._id });
    if (!complaint) return res.status(404).json({ error: "Complaint not found or not assigned to you" });
    
    if (status === "Resolved") {
      return res.status(400).json({ error: "Use /resolve endpoint with proof to resolve complaints" });
    }
    
    complaint.status = status;
    if (stage) complaint.stage = stage;
    complaint.timeline.push({ stage, time: new Date() });
    
    await complaint.save();
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload proof and resolve complaint
router.put('/complaints/:id/resolve', upload.single("resolutionImage"), async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const resolutionImage = req.file ? req.file.path : null;
    
    if (!resolutionNote || !resolutionImage) {
      return res.status(400).json({ error: "Both resolutionNote and resolutionImage are required to resolve" });
    }
    
    const complaint = await Complaint.findOne({ _id: req.params.id, officerId: req.officer._id });
    if (!complaint) return res.status(404).json({ error: "Complaint not found or not assigned to you" });
    
    if (complaint.status === "Resolved") {
      return res.status(400).json({ error: "Already resolved" });
    }
    
    complaint.status = "Resolved";
    complaint.stage = "Resolved";
    complaint.resolutionNote = resolutionNote;
    complaint.resolutionImage = resolutionImage;
    complaint.resolvedAt = new Date();
    complaint.timeline.push({ stage: "Resolved", time: new Date() });
    
    await complaint.save();
    
    // Update Officer metrics
    req.officer.currentLoad = Math.max(0, req.officer.currentLoad - 1);
    req.officer.resolvedComplaints += 1;
    await req.officer.save();
    
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
