import express from "express";
 import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

import { getMessage, sendMessage } from "../Controller/MessageController.js";

const router = express.Router();

router.route('/send/:userId').post(isAuthenticated, sendMessage);
router.route('/all/:userId').get(isAuthenticated, getMessage);

export default router;