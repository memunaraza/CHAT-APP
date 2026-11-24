import { Router } from "express";
import { getUsers, updateMe } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.get("/", protect, getUsers);
router.patch("/me", protect, updateMe);
export default router;
