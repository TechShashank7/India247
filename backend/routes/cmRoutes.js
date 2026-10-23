import express from 'express';
import Complaint from '../models/Complaint.js';
import Officer from '../models/Officer.js';
import Department from '../models/Department.js';
import { requireAuth, requireCM } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireCM);

// 1. Department Rankings
router.get('/department-rankings', async (req, res) => {
  try {
    const departments = await Department.find();
    const rankings = [];

    for (const dept of departments) {
      const complaints = await Complaint.find({ departmentId: dept._id });
      const total = complaints.length;
      const resolved = complaints.filter(c => c.status === "Resolved").length;
      
      let avgResolutionTime = 0;
      const resolvedComplaints = complaints.filter(c => c.status === "Resolved" && c.resolvedAt);
      if (resolvedComplaints.length > 0) {
        const totalTime = resolvedComplaints.reduce((acc, c) => {
          return acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60));
        }, 0);
        avgResolutionTime = (totalTime / resolvedComplaints.length).toFixed(1);
      }

      rankings.push({
        department: dept.name,
        totalComplaints: total,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
        avgResolutionTime
      });
    }

    // Sort by resolution rate desc
    rankings.sort((a, b) => b.resolutionRate - a.resolutionRate);
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Officer Rankings
router.get('/officer-rankings', async (req, res) => {
  try {
    const officers = await Officer.find().populate('departmentId');
    const rankings = officers.map(o => ({
      officer: o.name,
      department: o.departmentId ? o.departmentId.name : 'Unknown',
      trustScore: o.trustScore,
      currentLoad: o.currentLoad,
      resolvedComplaints: o.resolvedComplaints,
      reopenedComplaints: o.reopenedComplaints
    }));

    rankings.sort((a, b) => b.trustScore - a.trustScore);
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Critical Complaints
router.get('/critical-complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find({ status: { $ne: 'Resolved' } }).populate('departmentId');
    const critical = [];
    const now = new Date();

    for (const c of complaints) {
      const created = new Date(c.createdAt);
      const diffHours = (now - created) / (1000 * 60 * 60);
      const slaHours = c.departmentId ? (c.departmentId.slaHours || 48) : 48;

      let reason = null;
      if (diffHours > 72) {
        reason = "Older than 72 hours";
      } else if (diffHours > slaHours) {
        reason = "Exceeds SLA";
      } else if (c.reopen?.isReopened) {
        reason = "Reopened Escalation";
      }

      if (reason) {
        critical.push({
          trackingId: c.trackingId,
          title: c.title,
          reason,
          hoursPending: diffHours.toFixed(1)
        });
      }
    }

    res.json(critical);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Regional Analytics
router.get('/regional-analytics', async (req, res) => {
  try {
    const regions = [
      'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 
      'North East Delhi', 'North West Delhi', 'South East Delhi', 'South West Delhi', 
      'Shahdara', 'New Delhi'
    ];
    
    const analytics = [];
    
    for (const region of regions) {
      const complaints = await Complaint.find({ region });
      const total = complaints.length;
      const resolved = complaints.filter(c => c.status === "Resolved").length;
      const pending = complaints.filter(c => c.status === "Pending").length;
      
      analytics.push({
        region,
        complaintCount: total,
        resolvedCount: resolved,
        pendingCount: pending
      });
    }

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
