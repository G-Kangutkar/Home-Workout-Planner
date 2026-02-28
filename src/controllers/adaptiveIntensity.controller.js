
import supabase from "../config/supabase.config.js";

const STREAK_REQUIRED = 2;

const formatReps = (repsStr, increaseBy) => {
  if (!repsStr) return repsStr;
  if (repsStr.toLowerCase().startsWith("count")) return repsStr;
  if (repsStr.includes("-")) {
    const [min, max] = repsStr.split("-").map((n) => parseInt(n.trim()));
    return `${min + increaseBy}-${max + increaseBy}`;
  }
  if (repsStr.includes("each side")) {
    const num = parseInt(repsStr);
    return `${num + increaseBy} each side`;
  }
  if (repsStr.includes("each leg")) {
    const num = parseInt(repsStr);
    return `${num + increaseBy} each leg`;
  }
  const num = parseInt(repsStr);
  if (!isNaN(num)) return `${num + increaseBy}`;
  return repsStr;
};

const checkStreak = (sessionDates) => {
  if (!sessionDates?.length) return false;

  const uniqueDates = [
    ...new Set(sessionDates.map((d) => d.workout_date)),
  ].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length < STREAK_REQUIRED) return false;

  for (let i = 0; i < STREAK_REQUIRED - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next    = new Date(uniqueDates[i + 1]);

    const diffDays = Math.round(
      (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays !== 1) return false;
  }

  return true;
};

export const adaptIntensity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dayId } = req.body;

    if (!dayId) return res.status(400).json({ error: "dayId is required" });

    // Fetch last sessions ordered by date descending
    const { data: sessions, error: sessErr } = await supabase
      .from("workout_sessions")
      .select("workout_date")
      .eq("user_id", userId)
      .order("workout_date", { ascending: false })
      .limit(STREAK_REQUIRED);

    if (sessErr) return res.status(400).json({ error: sessErr.message });

    //  Count unique dates for accurate streak display
    const uniqueDates = [...new Set(sessions?.map((s) => s.workout_date))];
    const hasStreak   = checkStreak(sessions);

    //  Verify most recent session is today — prevents false streaks
    const today = new Date().toLocaleDateString("en-CA");
    if (uniqueDates[0] !== today) {
      return res.json({
        success:     true,
        hasStreak:   false,
        streakDays:  0,
        daysNeeded:  STREAK_REQUIRED,
        adjusted:    0,
        adjustments: [],
      });
    }

    if (!hasStreak) {
      return res.json({
        success:     true,
        hasStreak:   false,
        // Use unique date count
        streakDays:  uniqueDates.length,
        daysNeeded:  STREAK_REQUIRED - uniqueDates.length,
        adjusted:    0,
        adjustments: [],
      });
    }

    //  Check if intensity was already adapted today for this day
    // Prevents infinite increases every time user logs on a streak day
    const { data: alreadyAdapted } = await supabase
      .from("plan_day_exercises")
      .select("last_adapted")
      .eq("day_id", dayId)
      .limit(1)
      .maybeSingle();

    if (alreadyAdapted?.last_adapted === today) {
      return res.json({
        success:        true,
        hasStreak:      true,
        alreadyAdapted: true,
        streakDays:     STREAK_REQUIRED,
        adjusted:       0,
        adjustments:    [],
        message:        "Already adapted today",
      });
    }

    // Streak confirmed — get all exercises for this plan day
    const { data: planExercises, error: planErr } = await supabase
      .from("plan_day_exercises")
      .select("id, exercise_id, sets, reps")
      .eq("day_id", dayId);

    if (planErr) return res.status(400).json({ error: planErr.message });
    if (!planExercises?.length) return res.json({ adjustments: [] });

    const adjustments = [];

    for (const planEx of planExercises) {
      const newReps = formatReps(planEx.reps, 2);
      const newSets = planEx.sets + 1;

      const { error: updateErr } = await supabase
        .from("plan_day_exercises")
        .update({
          reps:         newReps,
          sets:         newSets,
          //  stamp today's date so it won't adapt again today
          last_adapted: today,
        })
        .eq("id", planEx.id);

      if (!updateErr) {
        adjustments.push({
          exerciseId: planEx.exercise_id,
          planExId:   planEx.id,
          oldReps:    planEx.reps,
          newReps,
          oldSets:    planEx.sets,
          newSets,
        });
      }
    }

    res.json({
      success:    true,
      hasStreak:  true,
      streakDays: STREAK_REQUIRED,
      adjusted:   adjustments.length,
      adjustments,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkWorkoutLog = async (req, res) => {
  try {
    const { dayId } = req.params;

    const { data, error } = await supabase
      .from("workout_sessions")
      .select()
      .eq("day_id", dayId)
      .eq("user_id", req.user.id)
      .eq("workout_date", new Date().toLocaleDateString("en-CA"))
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ alreadyLogged: !!data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};