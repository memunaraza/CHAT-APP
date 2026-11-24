import { Router } from "express";
import { getGroupMessages, getMessages } from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.get("/group/:groupId", protect, getGroupMessages);
router.get("/:userId", protect, getMessages);
export default router;
