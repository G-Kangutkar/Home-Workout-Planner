
import supabase  from "../config/supabase.config.js";

//  Log a completed workout session
export const logWorkout = async (req, res) => {
    try {
    const userId = req.user.id;
  // console.log("user",userId)
    const { day_id, day_name,  duration_minutes, exercises, notes } = req.body;
    // Get user weight for calorie calculation
    const { data: profile } = await supabase
      .from("profile")
      .select("weight")
      .eq("user_id", userId)
      .single();

    const weight = profile?.weight || 70; 
// console.log("profile",profile)
    // Calculate total calories for all exercises
    let totalCalories = 0;
    const exercisesWithCalories = [];

    for (const ex of exercises) {
      // Get exercise MET value
      const { data: exercise } = await supabase
        .from("exercises")
        .select("met_value")
        .eq("id", ex.exercise_id)
        .single();
  // console.log("exercise",exercise)
      const met = exercise?.met_value || 5.0;
      
      // Calculate calories for this exercise
      const sets = ex.sets_completed;
      const duration = ex.duration_seconds || (parseInt(ex.reps_completed) || 10) * 3 * sets;
      const hours = duration / 3600;
      const calories = Math.round(met * weight * hours);

      totalCalories += calories;
      
      exercisesWithCalories.push({
        ...ex,
        calories_burned: calories
      });
    }

    // Get plan_id if day_id provided
    let planId = null;
    if (day_id) {
      const { data: day } = await supabase
        .from("workout_plan_days")
        .select("plan_id")
        .eq("id", day_id)
        .single();
      planId = day?.plan_id;
    }

    // Insert workout session
    const { data: session, error: sessionErr } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        plan_id: planId,
        day_id,
        day_name,
        duration_minutes,
        total_calories: totalCalories,
        notes,
        workout_date: new Date().toISOString().split('T')[0] // today's date
      })
      .select()
      .single();

    if (sessionErr) return res.status(500).json({ error: sessionErr.message });

    // Insert completed exercises
    const exercisesToInsert = exercisesWithCalories.map(ex => ({
      session_id: session.id,
      exercise_id: ex.exercise_id,
      sets_completed: ex.sets_completed,
      reps_completed: ex.reps_completed,
      duration_seconds: ex.duration_seconds,
      calories_burned: ex.calories_burned,
      notes: ex.notes
    }));

    const { error: exErr } = await supabase
      .from("completed_exercises")
      .insert(exercisesToInsert);

    if (exErr) return res.status(500).json({ error: exErr.message });

    res.status(201).json({
      message: "Workout logged successfully",
      session: {
        ...session,
        exercises_count: exercisesToInsert.length,
        total_calories: totalCalories
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


  // Get performance statistics for charts
 
export const getStats = async (req, res) => {
  const userId = req.user.id;
  const { period = "30days" } = req.query;

  try {
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case "7days":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30days":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90days":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = now.getDate()
        // startDate = new Date("2026-02-25"); // all time
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all workout sessions in period
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("workout_date", startDateStr)
      .order("workout_date", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Calculate totals
    const totalWorkouts = sessions.length;
    const totalCalories = sessions.reduce((sum, s) => sum + (s.total_calories || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    // Group by day for daily chart
    const dailyData = sessions.map(s => ({
      date: s.workout_date,
      calories: s.total_calories || 0,
      duration: s.duration_minutes || 0,
      day: s.day_name
    }));

    // Group by week for weekly chart
    const weeklyData = {};
    sessions.forEach(s => {
      const date = new Date(s.workout_date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { week: weekKey, workouts: 0, calories: 0, minutes: 0 };
      }
      weeklyData[weekKey].workouts += 1;
      weeklyData[weekKey].calories += s.total_calories || 0;
      weeklyData[weekKey].minutes += s.duration_minutes || 0;
    });

    // Get most trained muscle groups
    const { data: completedExercises } = await supabase
      .from("completed_exercises")
      .select(`
        exercise_id,
        exercises (muscle_group)
      `)
      .in("session_id", sessions.map(s => s.id));

    const muscleGroups = {};
    completedExercises?.forEach(ex => {
      const muscle = ex.exercises?.muscle_group;
      if (muscle) {
        muscleGroups[muscle] = (muscleGroups[muscle] || 0) + 1;
      }
    });

    const muscleGroupData = Object.entries(muscleGroups)
      .map(([name, count]) => ({ name, count })) // converting to obj
      .sort((a, b) => b.count - a.count); // sorting highest 1st

    res.json({
      summary: {
        totalWorkouts,
        totalCalories,
        totalMinutes,
        avgCaloriesPerWorkout: totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0,
        avgDurationPerWorkout: totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0
      },
      charts: {
        daily: dailyData,
        weekly: Object.values(weeklyData),
        muscleGroups: muscleGroupData
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getHistory = async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select(`
        *,
        completed_exercises (
          id,
          sets_completed,
          reps_completed,
          calories_burned,
          exercise:exercises (
            id, name, muscle_group
          )
        )
      `)
      .eq("user_id", userId)
      .order("workout_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ sessions });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};







