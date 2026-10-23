import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from './models/Complaint.js';
import Department from './models/Department.js';
import Officer from './models/Officer.js';
import { assignComplaint } from './utils/assignmentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB for E2E Verification");

    // 1. Simulate Citizen filing a complaint and frontend deriving region
    const category = 'Roads';
    const region = 'North East Delhi';
    const aiDepartment = 'PWD';
    
    console.log(`\n--- Step 1: AI Classified & Frontend Built Payload ---`);
    console.log(`Category: ${category}, Region: ${region}, AI Dept: ${aiDepartment}`);

    // 2. Simulate Backend Auto-Assignment
    const assignment = await assignComplaint(category, region, aiDepartment);
    
    console.log(`\n--- Step 2: Backend Assignment Service Output ---`);
    console.log(assignment);

    // Verify Officer was found and load was incremented
    const assignedOfficer = await Officer.findById(assignment.officerId);
    console.log(`Assigned Officer: ${assignedOfficer.name}, Current Load: ${assignedOfficer.currentLoad}`);

    // 3. Save Complaint
    const trackingId = 'TEST-' + Date.now();
    const complaint = new Complaint({
      title: 'Huge pothole test',
      description: 'Testing e2e flow',
      category: category,
      departmentId: assignment.departmentId,
      officerId: assignment.officerId,
      region: region,
      trackingId,
      location: 'Some street in North East Delhi',
      assignedOfficer: {
        uid: assignment.officerId.toString(),
        name: assignment.officerName,
        department: assignment.departmentName
      }
    });

    await complaint.save();
    console.log(`\n--- Step 3: Complaint Saved ---`);
    console.log(`Tracking ID: ${trackingId}, Status: ${complaint.status}`);

    // 4. Test Performance API simulation (Tracker Page logic)
    const complaintsForOfficer = await Complaint.find({ officerId: assignment.officerId });
    const resolved = complaintsForOfficer.filter(c => c.status === "Resolved").length;
    console.log(`\n--- Step 4: Tracker Page Performance Lookup ---`);
    console.log(`Total complaints for officer: ${complaintsForOfficer.length}`);
    console.log(`Resolved: ${resolved}`);

    // Clean up test complaint
    await Complaint.findByIdAndDelete(complaint._id);
    
    // Decrement officer load since we deleted it
    await Officer.findByIdAndUpdate(assignment.officerId, { $inc: { currentLoad: -1 } });
    console.log(`\n✅ E2E Verification Successful. Cleaned up test data.`);
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verify();
