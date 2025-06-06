import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./router/userRoute.js";
import postRoute from "./router/postRoute.js";
import messageRoute from "./router/messageRoute.js";
import aiRoute from "./router/aiRoute.js"; // New AI route
import path from "path";
import { app, server } from "./socket/socket.js";
 
dotenv.config();

const PORT = process.env.PORT || 8000;
const __dirname = path.resolve();

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(urlencoded({ extended: true, limit: '10mb' }));
const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Routes
app.use("/user", userRoute);
app.use("/post", postRoute);
app.use("/message", messageRoute);
app.use("/ai", aiRoute); // New AI route
app.use(express.static(path.join(__dirname,"/frontend/dist")))
app.get('*',(req,res)=>{
  res.sendFile(path.resolve(__dirname,"frontend","dist","index.html"));
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
    connectDB();
    console.log(`Server listening at port ${PORT}`);
});