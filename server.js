import express from "express";
import dotenv from "dotenv";
dotenv.config()
import useAuth from "./src/routes/auth.route.js";
import useProfile from './src/routes/profile.route.js';
import useWorkout from "./src/routes/workout.route.js";
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4700;

app.use('/register',useAuth);
app.use("/api/profile", useProfile);
app.use("/api/workout", useWorkout);

app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})