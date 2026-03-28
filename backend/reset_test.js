import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false }), 'complaints');
    
    await Complaint.updateOne(
      { trackingId: 'IND-2026-65847' },
      { 
        $set: { 
          status: 'Resolved',
          'reopen.isReopened': false,
          'reopen.count': 0,
          'reopen.image': null
        }
      }
    );
    console.log("Reset IND-2026-65847");
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

reset();
