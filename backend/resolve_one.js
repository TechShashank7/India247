import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Complaint from './models/Complaint.js';

dotenv.config({ path: '../.env' });

const resolveOne = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find one pending complaint and resolve it
    const pending = await Complaint.findOne({ status: "Pending" });
    if (pending) {
      pending.status = "Resolved";
      pending.stage = "Resolved";
      pending.timeline.push({
        stage: "Resolved",
        time: new Date()
      });
      await pending.save();
      console.log(`Resolved complaint ${pending._id}`);
    } else {
      console.log("No pending complaints found.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

resolveOne();
