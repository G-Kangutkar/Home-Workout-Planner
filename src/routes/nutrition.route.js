import express from "express";
import { authenticate } from '../middlewares/auth.middleware.js'
import { getNutritionPlan } from "../controllers/nutitionPlan.controller.js";

const router = express.Router();

router.get('/nutrition-plan',authenticate,getNutritionPlan)

export default router;