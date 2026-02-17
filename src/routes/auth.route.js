import express from "express";
import { login, signIn } from "../controllers/auth.controller.js";

const router=express.Router();

router.post('/signup',signIn);
router.post('/login',login);

export default router;