import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Complaint from './models/Complaint.js';

dotenv.config({ path: '../.env' });

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await Complaint.countDocuments();
    console.log("Total complaints:", count);
    
    // Find ALL where rating is given
    const rated = await Complaint.find({ "rating.given": true });
    console.log("Rated complaints in DB:", rated.length);
    if (rated.length > 0) {
      console.log("Samples rated:", JSON.stringify(rated[0].rating, null, 2));
      console.log("Assigned Officer:", JSON.stringify(rated[0].assignedOfficer, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

test();
