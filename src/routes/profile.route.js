import express from "express";
import { getProfile, upsertProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.get('/',authenticate,getProfile);
router.post('/add',authenticate,upsertProfile);

export default router;