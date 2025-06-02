import express from "express";
import { handleAIChat } from "../Controller/aiController.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for Gemini API (60 requests per 15 minutes)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  message: 'Too many AI requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/chat", aiLimiter, isAuthenticated, handleAIChat);

export default router;