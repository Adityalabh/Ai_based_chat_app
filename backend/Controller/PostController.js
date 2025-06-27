import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { Comment } from "../models/Comment.js";
import { getReceiverSocketId, io } from "../Socket/socket.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzeImage } from '../utils/imageAnalysis.js';

export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image) return res.status(400).json({ message: 'Image required' });

        // Image optimization and upload
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        
        // Create post
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });

        // Update user's posts array
        await User.findByIdAndUpdate(
            authorId,
            { $push: { posts: post._id } }
        );

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
}

export const generateCaption = async (req, res) => {
    try {
        const { imageUrl } = req.body;          
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        // Initialize Gemini with the latest model
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.9
            },
            safetySettings: [
                { 
                    category: "HARM_CATEGORY_HARASSMENT", 
                    threshold: "BLOCK_NONE" 
                },
                { 
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE" 
                }
            ]
        });

        // Enhanced prompt for better captions
        const prompt = `
        Generate 3 engaging social media captions for this image with these rules:
        1. Each caption should be under 10 words
        2. Include emojis when appropriate
        3. First caption should be descriptive
        4. Second caption should be creative/funny
        5. Third caption should be inspirational
        6. Format as valid JSON array: ["caption1", "caption2", "caption3"]
        `;

        // Process image data for Gemini 1.5
        const base64Data = imageUrl.split(',')[1];
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            }
        };

        // Generate content with proper structure
        const result = await model.generateContent({
            contents: [
                { 
                    role: "user",
                    parts: [
                        { text: prompt },
                        imagePart
                    ]
                }
            ]
        });
        
        const response = await result.response;
        const text = response.text();
        
        // Parse response with robust error handling
        let captions;
        try {
            // First try to parse as JSON
            captions = JSON.parse(text);
            
            // Validate the response
            if (!Array.isArray(captions) || captions.length !== 3) {
                throw new Error('Invalid caption format');
            }
        } catch (parseError) {
            console.log('Falling back to text parsing');
            // If JSON fails, try to extract from text response
            const lines = text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.match(/^[{}[\]]/));
            
            captions = [
                lines[0] || "Beautiful moment captured",
                lines[1] || "Living my best life",
                lines[2] || "Making memories every day"
            ].slice(0, 3);
        }

        // Ensure we always return 3 captions
        if (captions.length < 3) {
            captions = captions.concat([
                "Exploring new horizons",
                "Adventure awaits!",
                "Cherishing the moment"
            ].slice(0, 3 - captions.length));
        }

        return res.status(200).json({ 
            success: true,
            captions 
        });

    } catch (error) {
        console.error('Caption generation error:', error);
        
        // Generate intelligent fallbacks based on time and random selection
        const hours = new Date().getHours();
        const timeOfDay = hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentSeason = seasons[Math.floor((new Date().getMonth() / 12) * 4)];
        
        const fallbacks = [
            // Time-based
            `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} vibes ☕`,
            `Golden ${timeOfDay} moments`,
            
            // Season-based
            `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} magic ✨`,
            `Living for this ${currentSeason}`,
            
            // Generic good ones
            "Making memories 📸",
            "Perfect shot!",
            "Frame-worthy moment 🖼️",
            "This is happiness 🌟"
        ];
        
        // Select 3 random fallbacks
        const selectedFallbacks = [];
        while (selectedFallbacks.length < 3 && fallbacks.length > 0) {
            const randomIndex = Math.floor(Math.random() * fallbacks.length);
            selectedFallbacks.push(fallbacks.splice(randomIndex, 1)[0]);
        }

        return res.status(200).json({
            success: false,
            captions: selectedFallbacks,
            message: 'Using fallback captions'
        });
    }
};

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: 'author',
            select: 'username, profilePicture'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'author',
                select: 'username, profilePicture'
            }
        });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const likePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.postId; 
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
        await post.save();

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
         
        const postOwnerId = post.author.toString();
        if(postOwnerId !== likeKrneWalaUserKiId){
            // emit a notification event
            const notification = {
                type:'like',
                userId:likeKrneWalaUserKiId,
                userDetails:user,
                postId,
                message:'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }

        return res.status(200).json({message:'Post liked', success:true});
    } catch (error) {

    }
}
export const dislikePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
        await post.save();

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if(postOwnerId !== likeKrneWalaUserKiId){
            // emit a notification event
            const notification = {
                type:'dislike',
                userId:likeKrneWalaUserKiId,
                userDetails:user,
                postId,
                message:'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }



        return res.status(200).json({message:'Post disliked', success:true});
    } catch (error) {

    }
}
export const addComment = async (req,res) =>{
    try {
        const postId = req.params.postId;
        const commentKrneWalaUserKiId = req.id;

        const {text} = req.body;

        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({message:'text is required', success:false});

        const comment = await Comment.create({
            text,
            author:commentKrneWalaUserKiId,
            post:postId
        })

        await comment.populate({
            path:'author',
            select:"username profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message:'Comment Added',
            comment,
            success:true
        })

    } catch (error) {
        console.log(error);
    }
};
export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.postId;

        const comments = await Comment.find({post:postId}).populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({message:'No comments found for this post', success:false});

        return res.status(200).json({success:true,comments});

    } catch (error) {
        console.log(error);
    }
}
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // Check authorization
        if (post.author.toString() !== authorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Delete post
        await Post.findByIdAndDelete(postId);

        // Remove post from user's posts array
        await User.findByIdAndUpdate(
            authorId,
            { $pull: { posts: postId } }
        );

        // Delete associated comments
        await Comment.deleteMany({ post: postId });

        return res.status(200).json({
            success: true,
            message: 'Post deleted'
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
}

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.id;
        
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: 'Post not found',
                success: false
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }

        if (user.bookmarks.includes(post._id)) {
            // Remove bookmark
            await User.findByIdAndUpdate(
                userId,
                { $pull: { bookmarks: post._id } }
            );
            return res.status(200).json({
                type: 'unsaved',
                message: 'Post removed from bookmark',
                success: true
            });
        } else {
            // Add bookmark
            await User.findByIdAndUpdate(
                userId,
                { $addToSet: { bookmarks: post._id } }
            );
            return res.status(200).json({
                type: 'saved',
                message: 'Post bookmarked',
                success: true
            });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Server error',
            success: false
        });
    }
}