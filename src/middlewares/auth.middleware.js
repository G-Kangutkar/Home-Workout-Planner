import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const authenticate= (req,res,next)=>{
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(400).json({error:"Token is needed"})
        }
        const token = authHeader.split(' ')[1];
        const decoded =  jwt.verify(token,process.env.JWT_SECRET);
        req.user = decoded;
        // console.log("user decode",req.user)
        next();
    } catch (error) {
         return res.status(401).json({ error: "Invalid or expired token" });
    }
}