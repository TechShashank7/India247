import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Complaint from './models/Complaint.js';

dotenv.config({ path: '../.env' });

const update = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const result = await Complaint.updateMany(
      { assignedOfficer: { $exists: false } },
      { 
        $set: { 
          assignedOfficer: {
            name: "Officer Sharma",
            department: "Civil Department"
          }
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} complaints.`);
    
    // Also update any where name is missing but object exists
    const result2 = await Complaint.updateMany(
      { "assignedOfficer.name": { $exists: false } },
      { 
        $set: { 
          "assignedOfficer.name": "Officer Sharma",
          "assignedOfficer.department": "Civil Department"
        }
      }
    );
    console.log(`Updated ${result2.modifiedCount} additional complaints.`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

update();
