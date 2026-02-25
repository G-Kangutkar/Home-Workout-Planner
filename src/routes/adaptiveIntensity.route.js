import express from "express";
import { adaptIntensity, checkWorkoutLog } from "../controllers/adaptiveIntensity.controller.js";
import { authenticate } from '../middlewares/auth.middleware.js';

const router= express.Router();

router.post('/adapt-intensity',authenticate,adaptIntensity);
router.get('/check-logged/:dayId',authenticate,checkWorkoutLog);


export default router;