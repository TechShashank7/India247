import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Complaint from './models/Complaint.js';

dotenv.config({ path: '../.env' });

const testRate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const id = "69c64ecb19161f9c25fccb92"; // IND-2026-52071
    const complaint = await Complaint.findById(id);
    
    if (!complaint) {
      console.log("Complaint not found in DB");
      return;
    }
    
    console.log("Found complaint:", complaint.trackingId, "Status:", complaint.status);
    
    complaint.rating = {
      value: 4,
      given: true
    };
    
    const saved = await complaint.save();
    console.log("Saved rating:", saved.rating);
    
    const fresh = await Complaint.findById(id);
    console.log("Fresh rating from DB:", fresh.rating);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

testRate();
