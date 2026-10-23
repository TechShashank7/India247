import express from 'express';
import Complaint from '../models/Complaint.js';
import Officer from '../models/Officer.js';
import Department from '../models/Department.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// 1. Overview
router.get('/overview', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'Pending' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const reopened = await Complaint.countDocuments({ "reopen.isReopened": true });

    res.json({
      totalComplaints: total,
      pending,
      inProgress,
      resolved,
      reopened
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Officer Management
router.get('/officers', async (req, res) => {
  try {
    const officers = await Officer.find().populate('departmentId');
    res.json(officers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/officers/:id/toggle-active', async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ error: "Officer not found" });
    
    officer.isActive = !officer.isActive;
    await officer.save();
    
    res.json(officer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Complaint Reassignment
router.put('/complaints/:id/reassign', async (req, res) => {
  try {
    const { newOfficerId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    const newOfficer = await Officer.findById(newOfficerId);
    if (!newOfficer) return res.status(404).json({ error: "New officer not found" });

    const oldOfficerId = complaint.officerId;

    if (oldOfficerId && oldOfficerId.toString() !== newOfficerId) {
      await Officer.findByIdAndUpdate(oldOfficerId, { $inc: { currentLoad: -1 } });
    }

    if (!oldOfficerId || oldOfficerId.toString() !== newOfficerId) {
      await Officer.findByIdAndUpdate(newOfficerId, { $inc: { currentLoad: 1 } });
    }

    complaint.officerId = newOfficer._id;
    complaint.departmentId = newOfficer.departmentId; // Align department if different
    complaint.timeline.push({ stage: "Reassigned by Admin", time: new Date() });
    
    await complaint.save();
    
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SLA Monitoring
router.get('/sla-monitor', async (req, res) => {
  try {
    const complaints = await Complaint.find({ status: { $ne: 'Resolved' } })
      .populate('departmentId')
      .populate('officerId');
      
    const flagged = [];
    const now = new Date();

    for (const c of complaints) {
      if (!c.departmentId) continue;
      const slaHours = c.departmentId.slaHours || 48;
      const created = new Date(c.createdAt);
      const diffHours = (now - created) / (1000 * 60 * 60);
      
      if (diffHours > slaHours) {
        flagged.push({
          complaintId: c._id,
          trackingId: c.trackingId,
          title: c.title,
          officerName: c.officerId ? c.officerId.name : 'Unassigned',
          departmentName: c.departmentId.name,
          hoursOverdue: (diffHours - slaHours).toFixed(1)
        });
      }
    }
    res.json(flagged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Department Analytics
router.get('/department-analytics', async (req, res) => {
  try {
    const departments = await Department.find();
    const analytics = [];

    for (const dept of departments) {
      const complaints = await Complaint.find({ departmentId: dept._id });
      const total = complaints.length;
      const resolved = complaints.filter(c => c.status === "Resolved").length;
      const pending = complaints.filter(c => c.status === "Pending").length;
      const reopened = complaints.filter(c => c.reopen?.isReopened).length;
      
      const resolvedComplaints = complaints.filter(c => c.status === "Resolved" && c.resolvedAt);
      let avgResolutionTime = 0;
      if (resolvedComplaints.length > 0) {
        const totalTime = resolvedComplaints.reduce((acc, c) => {
          return acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60));
        }, 0);
        avgResolutionTime = (totalTime / resolvedComplaints.length).toFixed(1);
      }

      analytics.push({
        department: dept.name,
        totalComplaints: total,
        resolved,
        pending,
        avgResolutionTime,
        reopenedPercent: total > 0 ? ((reopened / total) * 100).toFixed(1) : 0
      });
    }

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
