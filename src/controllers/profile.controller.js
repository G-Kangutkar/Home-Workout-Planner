// controllers/profile.controller.js

import supabase from "../config/supabase.config.js";


// ════════════════════════════════════════════════════════════════════
// GET /api/profile
// Returns the logged-in user's fitness profile
// ════════════════════════════════════════════════════════════════════
export const getProfile = async (req, res) => {
    
  const userId = req.user.id;

  const { data, error } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  // PGRST116 = no rows found (profile not created yet — not an error)
  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  res.json({ profile: data || null });
};

// ════════════════════════════════════════════════════════════════════
// POST /api/profile
// Create or update the logged-in user's fitness profile (upsert)
// ════════════════════════════════════════════════════════════════════
export const upsertProfile = async (req, res) => {
    try {
        console.log("✅ upsertProfile hit");
  console.log("user →", req.user);
  console.log("body →", req.body);
        const userId = req.user.id;
        const { weight, height, fitness_goal, activity_level, workout_duration } = req.body;

  // Validate required fields
  if (!weight || !height || !workout_duration) {
    return res.status(400).json({
      error: "weight, height and workout_duration are required.",
    });
  }

  // Validate ranges
  if (height < 50 || height > 300) {
    return res.status(400).json({ error: "Height must be between 50 and 300 cm." });
  }

  if (weight < 10 || weight > 500) {
    return res.status(400).json({ error: "Weight must be between 10 and 500 kg." });
  }

  if (workout_duration < 5 || workout_duration > 300) {
    return res.status(400).json({
      error: "Workout duration must be between 5 and 300 minutes.",
    });
  }

  const { data, error } = await supabase
    .from("profile")
    .upsert(
      {
        user_id: userId,
        weight,
        height,
        fitness_goal:     fitness_goal     || "general_fitness",
        activity_level:   activity_level   || "beginner",
        workout_duration,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({ profile: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  
};

// ════════════════════════════════════════════════════════════════════
// DELETE /api/profile
// Delete the logged-in user's fitness profile
// ════════════════════════════════════════════════════════════════════
export const deleteProfile = async (req, res) => {
  const userId = req.user.id;

  const { error } = await supabase
    .from("profile")
    .delete()
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Profile deleted successfully." });
};