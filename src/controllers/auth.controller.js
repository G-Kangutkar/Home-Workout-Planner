import supabase from "../config/supabase.config.js";
import bcrypt from "bcrypt";
import { generateAccessToken } from "../utils/jwt.utils.js";

export const signIn = async (req,res)=>{
    try {
        // console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
        // console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'loaded ✅' : 'MISSING ❌');
        // console.log('Body received:', req.body);
        const {name,email,password}=req.body;
        if(!name || !email || !password){
            return res.status(400).json({error:"name, email and password are required fields"})
        }

    const {data:existing, error:ErrorExisting} = await supabase
    .from('users').select('email').eq('email',email)

    if(ErrorExisting){
        return res.status(400).json({
            status:false,
            error:ErrorExisting.message
        })
    //     console.error('Full error:', JSON.stringify(ErrorExisting, Object.getOwnPropertyNames(ErrorExisting), 2));
    // return res.status(500).json({
    //     status: false,
    //     error: ErrorExisting.message,
    //     cause: ErrorExisting.cause?.message,
    //     code: ErrorExisting.cause?.code
    // })
    }
    if(existing && existing.length >0){
        return res.status(409).json({
            status:true,
            message:"Email already exists!"
        })
    }
    const hasedPass= await bcrypt.hash(password,10);
    const {data,error}= await supabase
    .from('users').insert([{name,email,password:hasedPass}]).select("name,email")

    if(error){
        return res.status(400).json({
            status:false,
            error:error.message
        })
    }
    return res.status(201).json({
        status:true,
        message:"User created successfully!!",
        data
    })

    } catch (error) {
      return res.status(500).json({
            status:false,
            error:error.message
        })
    //   console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    // return res.status(500).json({
    //     status: false,
    //     error: error.message,
    //     cause: error.cause?.message,
    //     code: error.cause?.code
    // })
}
    
}

export const login = async (req,res)=>{
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({error:"email and password is required"})
        }

        const {data,error} = await supabase
        .from('users').select().eq('email',email).maybeSingle()

        if(error){
             return res.status(400).json({error:error.message})
        }
        if(!data ){
            return res.status(404).json({error:"User not found"})
        }


        const isMatch = await bcrypt.compare(password,data.password);
        if(!isMatch){
            return res.status(401).json({error:"Invalid credentials"})
        }
       
        const accessToken = generateAccessToken(data);
        

        res.status(200).json({
            message:"login successfully!",
            id:data.id,
            accessToken:accessToken
        })

    } catch (error) {
        res.status(500).json({error:error.message})
    }
}
