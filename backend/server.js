import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import complaintRoutes from './routes/complaintRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Load environment variables (Render handles this automatically)
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug request logger
app.use((req, res, next) => {
  console.log(`[DEBUG] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// Root route (IMPORTANT for Render health check)
app.all('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.all('/', (req, res) => {
  res.status(200).end();
});

// Health check route
app.all('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global error handlers (VERY IMPORTANT for debugging crashes)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Start server FIRST (so 521 never happens)
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Then connect to MongoDB (non-blocking)
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });