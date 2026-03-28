import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false }), 'complaints');
    
    const reopened = await Complaint.find({ "reopen.isReopened": true }).lean();
    console.log(`Found ${reopened.length} reopened complaints:`);
    
    reopened.forEach(c => {
      console.log(`ID: ${c.trackingId}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Reopen Image: ${c.reopen?.image}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkDB();
