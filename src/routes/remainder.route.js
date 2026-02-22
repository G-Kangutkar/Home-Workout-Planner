import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { saveToken, setReminder,  } from "../controllers/remainder.controller.js";
const router =express.Router();


router.post("/set-reminder",authenticate,setReminder);
router.post('/save-token',authenticate,saveToken);
export default router;