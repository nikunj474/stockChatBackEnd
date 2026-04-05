import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './src/router/index';
import chatRouter from "./src/router/chatRouters";
import mongoose from "mongoose";
import path from "node:path";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Dynamic CORS - reads CLIENT_URL from environment variable
const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

app.use(cors({
      origin: (origin, callback) => {
              // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
              if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
              }
              return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
}));

app.use(express.static(path.join(__dirname, './public')));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
          console.log("Connected to MongoDB");
  })
  .catch(err => {
          console.error("Error connecting to MongoDB:", err);
  });

app.use(bodyParser.json());
app.use('/api', apiRoutes);
app.use('/api', chatRouter);

app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
});
