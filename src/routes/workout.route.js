// routes/workout.routes.js
import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getExercises,
  generatePlan,
  getActivePlan,
  renamePlan,
  swapExercise,
  addExercise,
  removeExercise,
} from "../controllers/workout.controller.js";

const router = express.Router();

router.use(authenticate);   // protect all workout routes

// Exercise library
router.get("/exercises", getExercises);

// Plan
router.post("/generate", generatePlan);
router.get("/plan", getActivePlan);
router.put("/plan/:id",renamePlan);

// Day exercises (swap / add / remove)
router.put("/day-exercise/:id", swapExercise);
router.post("/day/:dayId/exercise", addExercise);
router.delete("/day-exercise/:id", removeExercise);

export default router;