import User from '../models/User.js';
import Officer from '../models/Officer.js';

export const requireAuth = async (req, res, next) => {
  const uid = req.headers['x-user-uid'];
  if (!uid) return res.status(401).json({ error: "Unauthorized: Missing UID" });
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Auth Error" });
  }
};

export const requireOfficer = async (req, res, next) => {
  if (!req.user || req.user.role !== 'officer') {
    return res.status(403).json({ error: "Forbidden: Officer access required" });
  }
  try {
    const officer = await Officer.findOne({ uid: req.user.uid });
    if (!officer) return res.status(404).json({ error: "Officer profile not found for this user" });
    req.officer = officer;
    next();
  } catch (error) {
    res.status(500).json({ error: "Officer mapping error" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
};

export const requireCM = (req, res, next) => {
  if (!req.user || req.user.role !== 'cm') {
    return res.status(403).json({ error: "Forbidden: CM access required" });
  }
  next();
};
