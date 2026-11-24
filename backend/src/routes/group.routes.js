import { Router } from "express";
import {
  addMembers, createGroup, getMyGroups, removeMember, renameGroup,
} from "../controllers/group.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", getMyGroups);
router.post("/", createGroup);
router.patch("/:id", renameGroup);
router.post("/:id/members", addMembers);
router.delete("/:id/members/:userId", removeMember);

export default router;
