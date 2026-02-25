import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getRecoveryGuide } from "../controllers/recover.controller.js";


const router = express.Router();


router.get("/recovery/:goal", authenticate,getRecoveryGuide);

export default router;