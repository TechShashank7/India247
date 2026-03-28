import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Synchronize user from Firebase to MongoDB
router.post('/sync', async (req, res) => {
  const { uid, email, name, role, city } = req.body;
  
  if (!uid || !email || !name) {
    return res.status(400).json({ error: 'Missing required user fields' });
  }

  try {
    let user = await User.findOne({ uid });
    let existingRole = user ? user.role : (role || 'user');

    if (!user) {
      user = new User({ uid, email, name, role: existingRole, city });
      await user.save();
    } else {
      user.name = name;
      user.email = email;
      if (city) user.city = city;
      await user.save();
      existingRole = user.role;
    }

    res.status(200).json({ uid: user.uid, role: existingRole, name: user.name, email: user.email, city: user.city });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Database error syncing user' });
  }
});

// Fetch user profile
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error fetching user' });
  }
});

export default router;
