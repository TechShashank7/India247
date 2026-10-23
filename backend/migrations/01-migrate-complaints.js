import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from '../models/Complaint.js';
import Department from '../models/Department.js';
import Officer from '../models/Officer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const defaultDepartments = [
  { name: 'Public Works Department (PWD)', code: 'PWD', handledCategories: ['Roads', 'Construction & Safety', 'Roads & Infrastructure'] },
  { name: 'Delhi Jal Board (DJB)', code: 'DJB', handledCategories: ['Water', 'Water Supply & Sewer'] },
  { name: 'Municipal Corporation of Delhi (MCD)', code: 'MCD', handledCategories: ['Garbage', 'Sanitation & Cleanliness', 'Animal Welfare'] }
];

const migrate = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in .env file");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for migration...");

    // 1. Create or get Departments
    const deptMap = {};
    for (const deptData of defaultDepartments) {
      let dept = await Department.findOne({ code: deptData.code });
      if (!dept) {
        dept = new Department(deptData);
        await dept.save();
      }
      deptMap[deptData.code] = dept;
    }

    const officerMap = {}; // mapping by department id
    const regions = [
      'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 
      'North East Delhi', 'North West Delhi', 'South East Delhi', 'South West Delhi', 
      'Shahdara', 'New Delhi'
    ];
    let officerCount = 1;
    for (const code of Object.keys(deptMap)) {
      const deptId = deptMap[code]._id;
      // create an officer for a few regions to ensure coverage
      for (const region of regions) {
        const email = `officer${officerCount}@${code.toLowerCase()}.gov.in`;
        let officer = await Officer.findOne({ email });
        if (!officer) {
          officer = new Officer({
            name: `Officer ${officerCount} (${code})`,
            email,
            phone: '999999999' + (officerCount % 10),
            departmentId: deptId,
            region,
            designation: 'Nodal Officer',
          });
          await officer.save();
        }
        if (!officerMap[deptId]) officerMap[deptId] = [];
        officerMap[deptId].push(officer);
        officerCount++;
      }
    }

    // 3. Migrate Complaints
    const complaints = await Complaint.find();
    let migratedCount = 0;
    
    for (const complaint of complaints) {
      if (complaint.departmentId) continue; // Already migrated

      // Find department by category
      let matchedDept = null;
      for (const code of Object.keys(deptMap)) {
        if (deptMap[code].handledCategories.includes(complaint.category)) {
          matchedDept = deptMap[code];
          break;
        }
      }

      if (!matchedDept) {
        // fallback to MCD
        matchedDept = deptMap['MCD'];
      }

      const officers = officerMap[matchedDept._id];
      const matchedOfficer = officers[Math.floor(Math.random() * officers.length)];

      complaint.departmentId = matchedDept._id;
      complaint.officerId = matchedOfficer._id;
      complaint.region = complaint.region || 'Central Delhi'; // Default if none exists

      // update assignedOfficer for backward compatibility
      complaint.assignedOfficer = {
        uid: matchedOfficer._id.toString(),
        name: matchedOfficer.name,
        department: matchedDept.name
      };

      await complaint.save();
      migratedCount++;
    }

    console.log(`✅ Migration complete! Migrated ${migratedCount} complaints.`);
    process.exit();
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
};

migrate();
