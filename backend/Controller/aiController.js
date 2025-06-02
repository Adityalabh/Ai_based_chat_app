import { GoogleGenerativeAI } from "@google/generative-ai";
import { User } from "../models/User.js";
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 });

const FALLBACK_RESPONSES = [
  "I'd be happy to help with that!",
  "Interesting question! Let me think about that...",
  "Thanks for sharing! What else would you like to know?",
  "I'm designed to assist with various topics. Could you elaborate?",
  "That's a great point! Here's what I know..."
];

export const handleAIChat = async (req, res) => {
  try {
    const { message } = req.body; // Remove history for now
    const userId = req.id;
    
    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get user context
    const user = await User.findById(userId).select('username bio');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check cache
    const cacheKey = `${userId}:${message}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use the latest model names
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",  // Updated model name
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    });
    
    // Create system instruction with user context
    const systemInstruction = {
      role: "system",
      parts: [{
        text: `You're chatting with ${user.username}. ${
          user.bio ? `Their bio: "${user.bio}". ` : ''
        }Keep responses friendly and concise (1-2 sentences).`
      }]
    };
    
    // Create chat history
    const chat = model.startChat({
      systemInstruction: systemInstruction,
      history: [] // Start with empty history for simplicity
    });

    // Get response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const reply = response.text();

    // Cache successful response
    const apiResponse = { 
      reply,
      source: 'gemini'
    };
    cache.set(cacheKey, apiResponse);
    
    return res.json(apiResponse);

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Fallback response
    const fallbackResponse = {
      reply: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
      source: 'fallback'
    };
    
    return res.json(fallbackResponse);
  }
};