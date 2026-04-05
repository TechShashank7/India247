import express from 'express';
import multer from 'multer';
import Complaint from '../models/Complaint.js';
import { validateReopenReason, validateReopenImage } from '../utils/reopenAI.js';
import { classifyIssue } from '../utils/classificationAI.js';

import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "reopen_complaints",
    allowed_formats: ["jpg", "png", "webp"],
  },
});

const upload = multer({ storage });

// Logger to debug route hits
router.use((req, res, next) => {
  console.log(`[Complaint Route] ${req.method} ${req.url}`);
  next();
});

// AI Classification Endpoint
router.post("/classify-issue", async (req, res) => {
  try {
    const { intent, description } = req.body;
    console.log("[Classification API] Incoming intent:", intent);
    
    if (!intent && !description) {
      return res.status(400).json({ error: "Missing intent or description" });
    }

    const result = await classifyIssue(intent, description);
    console.log("[Classification API] Classification result:", result);

    res.json(result);
  } catch (err) {
    console.error("[Classification API] ERROR:", err.message);
    res.status(500).json({ error: "Classification failed" });
  }
});

// 5. Reopen complaint
router.post("/:id/reopen", upload.single("image"), async (req, res) => {
  try {
    const reason = req.body.reason;
    const image = req.file ? req.file.path : null;

    console.log("REOPEN ATTEMPT FOR ID:", req.params.id);

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // 1️⃣ ALWAYS check DB rules FIRST before wasting any AI calls
    if (complaint.status !== "Resolved") {
      return res.status(400).json({ error: "Only resolved complaints can be reopened" });
    }

    if (complaint.reopen?.count >= 1) {
      return res.status(400).json({ error: "Complaint already reopened once" });
    }

    const originalDescription = complaint.description;

    console.log("Original:", originalDescription);
    console.log("Reason:", reason);

    // 2️⃣ ONLY run AI checks if the DB allows it
    const reasonCheck = await validateReopenReason(originalDescription, reason);
    if (!reasonCheck.valid) {
      return res.status(400).json({ error: reasonCheck.message });
    }

    const imageCheck = await validateReopenImage(originalDescription, reason, image);
    if (!imageCheck.valid) {
      return res.status(400).json({ error: imageCheck.message });
    }

    complaint.status = "Pending";
    complaint.stage = "Sent to Department";

    complaint.reopen = {
      isReopened: true,
      reason,
      image: image || null,
      count: 1
    };

    // Add to timeline
    complaint.timeline.push({
      stage: "Reopened by User",
      time: new Date()
    });

    await complaint.save();

    res.json(complaint);
  } catch (err) {
    console.error("REOPEN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// 1. Create a new complaint
router.post('/', async (req, res) => {
  try {
    // Use tracking ID from frontend if provided, otherwise generate a new one
    const trackingId = req.body.trackingId || `IND-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Create complaint with the determined trackingId
    const complaint = new Complaint({
      ...req.body,
      trackingId,
      timeline: [
        {
          stage: req.body.stage || "Complaint Filed",
          time: new Date()
        }
      ]
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

// 6. Rate API
router.post("/:id/rate", async (req, res) => {
  try {
    const { value } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ error: "Not found" });

    if (complaint.status !== "Resolved") {
      return res.status(400).json({ error: "Can only rate resolved complaints" });
    }

    if (complaint.rating?.given) {
      return res.status(400).json({ error: "Already rated" });
    }

    console.log(`[Rate API] Saving rating ${value} for complaint ${req.params.id}`);

    const result = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          rating: {
            value: Number(value),
            given: true
          }
        }
      },
      { new: true }
    );

    if (!result) {
      console.error(`[Rate API ERROR] FAILED to update complaint ${req.params.id}`);
      return res.status(500).json({ error: "Failed to update record" });
    }

    console.log(`[Rate API SUCCESS] Saved rating ${value} for ${req.params.id}`);

    res.json({ message: "Rating submitted", complaint: result });
  } catch (err) {
    console.error("[Rate API CRITICAL ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Performance API
router.get("/officer/performance/:name", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      "assignedOfficer.name": req.params.name
    });

    const total = complaints.length;

    const resolved = complaints.filter(c => c.status === "Resolved").length;

    const ratings = complaints
      .filter(c => c.rating?.given)
      .map(c => c.rating.value);

    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : 0;

    const avgResolutionTime = complaints
      .filter(c => c.status === "Resolved")
      .map(c => {
        const created = new Date(c.createdAt);
        const resolvedTime = c.timeline.find(t => t.stage === "Resolved")?.time;
        return resolvedTime ? (new Date(resolvedTime) - created) / (1000 * 60 * 60) : 0;
      });

    const avgTime =
      avgResolutionTime.length > 0
        ? (avgResolutionTime.reduce((a, b) => a + b, 0) / avgResolutionTime.length).toFixed(1)
        : 0;

    res.json({
      total,
      resolved,
      completionRate: total ? ((resolved / total) * 100).toFixed(0) : 0,
      avgRating,
      avgTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Feed API
router.get("/feed", async (req, res) => {
  try {
    const { sort, category, lat, lng } = req.query;
    let complaints = await Complaint.find();

    // category filter
    if (category && category !== "All") {
      complaints = complaints.filter(c => c.category === category);
    }

    // Near Me (Basic distance approx)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      complaints = complaints.filter(c => {
        if (!c.lat || !c.lng) return false;
        const dist = Math.sqrt(Math.pow(c.lat - userLat, 2) + Math.pow(c.lng - userLng, 2));
        return dist < 0.1; // roughly 10km
      });
    }

    // sorting
    if (sort === "latest") {
      complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (sort === "upvotes") {
      complaints.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    if (sort === "trending") {
      complaints.sort((a, b) => {
        const scoreA = (a.upvotes || 0) * 2 + (a.comments?.length || 0) + (a.shares || 0);
        const scoreB = (b.upvotes || 0) * 2 + (b.comments?.length || 0) + (b.shares || 0);
        return scoreB - scoreA;
      });
    }

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== GAMIFICATION APIs ======

// User Points API
router.get("/user/points/:name", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      "user.name": req.params.name
    });

    let points = 0;
    let filed = 0;
    let resolved = 0;
    let totalUpvotes = 0;
    let totalComments = 0;

    complaints.forEach(c => {
      // filed
      points += 10;
      filed++;

      // resolved
      if (c.status === "Resolved") {
        points += 25;
        resolved++;
      }

      // upvotes received
      const upvotes = c.upvotes || 0;
      points += upvotes * 2;
      totalUpvotes += upvotes;

      // comments made BY THIS USER across all complaints
      const userComments = (c.comments || []).filter(
        cm => cm.userName === req.params.name
      ).length;
      points += userComments;
      totalComments += userComments;
    });

    // Also count comments this user made on OTHER people's complaints
    const allComplaints = await Complaint.find({
      "user.name": { $ne: req.params.name }
    });

    allComplaints.forEach(c => {
      const userComments = (c.comments || []).filter(
        cm => cm.userName === req.params.name
      ).length;
      points += userComments;
      totalComments += userComments;
    });

    res.json({ points, filed, resolved, totalUpvotes, totalComments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard API
router.get("/leaderboard", async (req, res) => {
  try {
    const complaints = await Complaint.find();

    const userMap = {};

    complaints.forEach(c => {
      const name = c.user?.name || "Anonymous";

      if (!userMap[name]) userMap[name] = 0;

      // filed
      userMap[name] += 10;

      // resolved
      if (c.status === "Resolved") {
        userMap[name] += 25;
      }

      // upvotes
      userMap[name] += (c.upvotes || 0) * 2;

      // comments by user
      (c.comments || []).forEach(cm => {
        if (cm.userName) {
          if (!userMap[cm.userName]) userMap[cm.userName] = 0;
          userMap[cm.userName] += 1;
        }
      });
    });

    const leaderboard = Object.entries(userMap)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch single complaint (by trackingId)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({
      trackingId: id
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Update complaint status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, stage } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (stage) updateData.stage = stage;

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        $push: {
          timeline: {
            stage,
            time: new Date()
          }
        }
      },
      { new: true }
    );

    res.json(updatedComplaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote API
router.post("/:id/upvote", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Not found" });

    complaint.upvotes = (complaint.upvotes || 0) + 1;
    await complaint.save();

    res.json({ upvotes: complaint.upvotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comment API
router.post("/:id/comment", async (req, res) => {
  try {
    const { text, userName, userId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Not found" });

    complaint.comments.push({ text, userName: userName || "Anonymous", userId: userId || "" });
    await complaint.save();

    res.json(complaint.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share API
router.post("/:id/share", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Not found" });

    complaint.shares = (complaint.shares || 0) + 1;
    await complaint.save();

    res.json({ shares: complaint.shares });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// End of APIs

export default router;
