import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from './models/Complaint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = [
  {
    title: "Large Pothole on MG Road",
    category: "Roads",
    description: "Huge pothole near the metro station causing traffic delays. Re-paving needed immediately.",
    trackingId: `IND-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    location: "MG Road, Sector 14",
    imageUrl: "https://images.unsplash.com/photo-1598229839738-520fe3c2f6ad?auto=format&fit=crop&q=80&w=1000",
    upvotes: 42,
    shares: 12,
    status: "Pending",
    comments: [
      { text: "This has been there for weeks!", createdAt: new Date() },
      { text: "I almost crashed my bike here.", createdAt: new Date() }
    ]
  },
  {
    title: "Broken Water Pipe Leakage",
    category: "Water",
    description: "Main line pipe burst near Central Park. Thousands of liters being wasted.",
    trackingId: `IND-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    location: "Central Park East",
    imageUrl: "https://images.unsplash.com/photo-1517646281553-9b935c101032?auto=format&fit=crop&q=80&w=1000",
    upvotes: 28,
    shares: 5,
    status: "In Progress",
    comments: [
      { text: "Reported it yesterday.", createdAt: new Date() }
    ]
  },
  {
    title: "Uncollected Garbage Pile",
    category: "Garbage",
    description: "Garbage hasn't been picked up for 4 days in Block C. Foul smell spreading.",
    trackingId: `IND-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    location: "Block C, Lajpat Nagar",
    imageUrl: "https://images.unsplash.com/photo-1605600611284-195205ef91b2?auto=format&fit=crop&q=80&w=1000",
    upvotes: 55,
    shares: 20,
    status: "Pending",
    comments: [
      { text: "Health hazard for kids.", createdAt: new Date() },
      { text: "Where is the MCD truck?", createdAt: new Date() }
    ]
  }
];

const seedDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in .env file");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");
    
    await Complaint.insertMany(seedData);
    console.log("✅ Seed data inserted successfully!");
    
    process.exit();
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

seedDB();
