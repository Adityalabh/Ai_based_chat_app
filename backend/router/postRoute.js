import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { addComment, addNewPost, bookmarkPost, deletePost, dislikePost, getAllPost, getCommentsOfPost, getUserPost, likePost } from "../Controller/PostController.js";
import { generateCaption } from "../Controller/PostController.js";

const router = express.Router();

router.route("/addpost").post(isAuthenticated, upload.single('image'), addNewPost);
router.route("/all").get(isAuthenticated,getAllPost);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/:postId/like").get(isAuthenticated, likePost);
router.route("/:postId/dislike").get(isAuthenticated, dislikePost);
router.route("/:postId/comment").post(isAuthenticated, addComment); 
router.route("/:postId/comment/all").post(isAuthenticated, getCommentsOfPost);
router.route("/delete/:postId").delete(isAuthenticated, deletePost);
router.route("/:postId/bookmark").get(isAuthenticated, bookmarkPost);
router.post("/generate-caption", isAuthenticated, generateCaption);

export default router;
