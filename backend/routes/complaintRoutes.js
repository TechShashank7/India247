import express from 'express';
import Complaint from '../models/Complaint.js';

const router = express.Router();

// 1. Create a new complaint
router.post('/', async (req, res) => {
  try {
    const complaint = new Complaint({
      ...req.body,
      status: req.body.status || 'Pending',
      upvotes: req.body.upvotes || 0
    });
    const savedComplaint = await complaint.save();
    res.status(201).json(savedComplaint);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. Fetch all complaints (Sort by newest first)
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Fetch single complaint
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Update complaint status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedComplaint) return res.status(404).json({ message: 'Complaint not found' });
    res.status(200).json(updatedComplaint);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
