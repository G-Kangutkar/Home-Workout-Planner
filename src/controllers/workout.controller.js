
import supabase from "../config/supabase.config.js";
import { generateWorkoutPlan } from "../lib/workoutGenerator.lib.js";


export const getExercises = async (req, res) => {
  const { muscle, difficulty, search } = req.query;

  let query = supabase
    .from("exercises")
    .select("*")
    .order("muscle_group")
    .order("name");

  if (muscle)     query = query.eq("muscle_group", muscle);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (search)     query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const grouped = data.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {});

  res.json({ exercises: data, grouped, total: data.length });
};


export const generatePlan = async (req, res) => {
  const userId = req.user.id;

  // 1. Get user profile
  const { data: profile, error: profileErr } = await supabase
    .from("profile")
    .select("fitness_goal, activity_level, workout_duration")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) {
    return res.status(400).json({
      error: "Profile not found. Please complete your fitness profile first.",
    });
  }

  // 2. Fetch all exercises
  const { data: exercises, error: exErr } = await supabase
    .from("exercises")
    .select("*");

  if (exErr) return res.status(500).json({ error: exErr.message });

  // 3. Generate plan
  const plan = generateWorkoutPlan(profile, exercises);

  // 4. Deactivate current active plan
  await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  // 5. Insert new plan
  const { data: newPlan, error: planErr } = await supabase
    .from("workout_plans")
    .insert({ user_id: userId, name: plan.name, goal: plan.goal, is_active: true ,
      // estimated_weekly_calories:plan.estimated_weekly_calories
      })
    .select()
    .single();

  if (planErr) return res.status(500).json({ error: planErr.message });

  // 6. Insert days
  const daysToInsert = plan.days.map((d) => ({
    plan_id: newPlan.id,
    day: d.day,
    is_rest_day: d.is_rest_day,
    focus: d.focus,
    order_index: d.order_index,
    //  estimated_calories :d.estimated_calories
  }));

  const { data: insertedDays, error: daysErr } = await supabase
    .from("workout_plan_days")
    .insert(daysToInsert)
    .select();

  if (daysErr) return res.status(500).json({ error: daysErr.message });

  // 7. Insert exercises per day
  const exercisesToInsert = [];

  for (const day of plan.days) {
    if (day.is_rest_day || !day.exercises.length) continue;
    const insertedDay = insertedDays.find((d) => d.day === day.day);
    if (!insertedDay) continue;

    for (const ex of day.exercises) {
      exercisesToInsert.push({
        day_id: insertedDay.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        duration_seconds: ex.duration_seconds
      });
    }
  }

  if (exercisesToInsert.length) {
    const { error: exInsertErr } = await supabase
      .from("plan_day_exercises")
      .insert(exercisesToInsert);





    if (exInsertErr) return res.status(500).json({ error: exInsertErr.message });
  }

  res.status(201).json({ message: "Workout plan generated successfully", plan: newPlan });
};


export const getActivePlan = async (req, res) => {
  const userId = req.user.id;
// console.log("userid",userId)
  const { data: plan, error: planErr } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  // console.log(plan)
  if (planErr || !plan) {
    return res.status(404).json({ error: "No active workout plan found." });
  }

  const { data: days, error: daysErr } = await supabase
    .from("workout_plan_days")
    .select("*")
    .eq("plan_id", plan.id)
    .order("order_index");

  if (daysErr) return res.status(500).json({ error: daysErr.message });

  const dayIds = days.map((d) => d.id);

  const { data: dayExercises, error: exErr } = await supabase
    .from("plan_day_exercises")
    .select(`
      *,
      exercise:exercises (
        id, name, description, instructions,
        muscle_group, difficulty,
        default_sets, default_reps,
        duration_seconds, tags, video_url,met_value
      )
    `)
    .in("day_id", dayIds)
    .order("order_index");

  if (exErr) return res.status(500).json({ error: exErr.message });

  const daysWithExercises = days.map((day) => ({
    ...day,
    exercises: dayExercises.filter((ex) => ex.day_id === day.id),
  }));

  res.json({ plan: { ...plan, days: daysWithExercises } });
};


export const renamePlan = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Plan name is required." });
  }

  const { data, error } = await supabase
    .from("workout_plans")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ plan: data });
};


export const swapExercise = async (req, res) => {
  const { id } = req.params;
  const { exercise_id, sets, reps, duration_seconds, notes } = req.body;

  if (!exercise_id) {
    return res.status(400).json({ error: "exercise_id is required." });
  }

  // Verify ownership
  const { data: existing, error: findErr } = await supabase
    .from("plan_day_exercises")
    .select(`id, day:workout_plan_days ( plan:workout_plans ( user_id ) )`)
    .eq("id", id)
    .single();

  if (findErr || !existing) {
    return res.status(404).json({ error: "Exercise entry not found." });
  }

  if (existing.day?.plan?.user_id !== req.user.id) {
    return res.status(403).json({ error: "Not authorized." });
  }

  const { data, error } = await supabase
    .from("plan_day_exercises")
    .update({ exercise_id, sets, reps, duration_seconds, notes })
    .eq("id", id)
    .select(`
      *,
      exercise:exercises (
        id, name, description, muscle_group,
        difficulty, default_sets, default_reps,
        duration_seconds, tags
      )
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ dayExercise: data });
};


export const addExercise = async (req, res) => {
  const { dayId } = req.params;
  const { exercise_id, sets, reps, duration_seconds, notes } = req.body;

  if (!exercise_id) {
    return res.status(400).json({ error: "exercise_id is required." });
  }

  const { data: existing } = await supabase
    .from("plan_day_exercises")
    .select("order_index")
    .eq("day_id", dayId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existing?.length ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from("plan_day_exercises")
    .insert({ day_id: dayId, exercise_id, order_index: nextIndex, sets, reps, duration_seconds, notes })
    .select(`
      *,
      exercise:exercises (
        id, name, description, muscle_group,
        difficulty, default_sets, default_reps,
        duration_seconds, tags
      )
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ dayExercise: data });
};


export const removeExercise = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("plan_day_exercises")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Exercise removed from day." });
};