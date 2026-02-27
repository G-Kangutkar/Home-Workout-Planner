import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getAuthUrl,
  handleCallback,
  syncCalendar,
  getCalendarStatus,
  updatePreferences,
  disconnectCalendar,
} from "../controllers/calendar.controller.js";

const router = express.Router();

// Public — no auth needed (Google redirects here)
router.get("/calendar/callback",  handleCallback);

// Protected
router.get("/calendar/auth-url",      authenticate, getAuthUrl);
router.get("/calendar/status",        authenticate, getCalendarStatus);
router.post("/calendar/sync",         authenticate, syncCalendar);
router.put("/calendar/preferences",   authenticate, updatePreferences);
router.delete("/calendar/disconnect", authenticate, disconnectCalendar);

export default router;