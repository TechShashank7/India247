import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from './models/Complaint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await Complaint.countDocuments();
    const cats = await Complaint.distinct('category');
    console.log(`TOTAL_COMPLAINTS_COUNT:${count}`);
    console.log(`CATEGORIES:${JSON.stringify(cats)}`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
