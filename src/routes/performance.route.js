
import { authenticate } from "../middlewares/auth.middleware.js";
import express from "express";
import { logWorkout, getStats, getHistory } from "../controllers/performance.controller.js";

const router = express.Router();

router.use(authenticate); // all routes protected

// POST /api/performance/log-workout - log a completed workout
router.post("/log-workout", logWorkout);

// GET /api/performance/stats?period=30days - get statistics for charts
router.get("/stats", getStats);

// GET /api/performance/history?limit=20&offset=0 - get workout history
router.get("/history", getHistory);

export default router;