import express from "express";
import dotenv from "dotenv";
dotenv.config()
import cors from "cors";
import useAuth from "./src/routes/auth.route.js";
import useProfile from './src/routes/profile.route.js';
import useWorkout from "./src/routes/workout.route.js";
import usePerformance from "./src/routes/performance.route.js";
import useRemainder from "./src/routes/remainder.route.js";
import { startReminderCron } from './src/cron/remainderCron.js';
import useNutrition from './src/routes/nutrition.route.js';
const app = express();
app.use(express.json());
app.use(cors())

const PORT = process.env.PORT || 4700;
startReminderCron();
app.use('/register',useAuth);
app.use("/api/profile", useProfile);
app.use("/api/workout", useWorkout);
app.use('/performance',usePerformance);
app.use("/api",useRemainder);
app.use('/api',useNutrition);

app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})