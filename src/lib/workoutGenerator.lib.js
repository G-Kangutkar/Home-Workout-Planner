
// Rule-based workout plan generator
// Generates a 3-day/week plan based on user goal + activity level + duration
// ─────────────────────────────────────────────────────────────────────────────

// ── Day configurations per goal ───────────────────────────────────────────────
// Each goal has 3 workout days with a specific focus
// Rest days are filled in automatically for remaining days

const PLAN_CONFIGS = {
  weight_loss: {
    planName: "Fat Burn Plan",
    days: [
      {
        day: "monday",
        focus: "Full Body HIIT",
        muscleGroups: ["full_body", "cardio"],
        tags: ["hiit", "cardio", "explosive"],
      },
      {
        day: "wednesday",
        focus: "Core & Cardio",
        muscleGroups: ["core", "cardio"],
        tags: ["cardio", "abs"],
      },
      {
        day: "friday",
        focus: "Lower Body Burn",
        muscleGroups: ["legs", "glutes", "cardio"],
        tags: ["cardio", "lower-body"],
      },
    ],
  },

  muscle_gain: {
    planName: "Strength Builder Plan",
    days: [
      {
        day: "monday",
        focus: "Push Day (Chest & Shoulders)",
        muscleGroups: ["chest", "shoulders", "arms"],
        tags: ["push", "upper-body"],
      },
      {
        day: "wednesday",
        focus: "Pull Day (Back & Arms)",
        muscleGroups: ["back", "arms"],
        tags: ["pull", "upper-body"],
      },
      {
        day: "friday",
        focus: "Legs & Glutes",
        muscleGroups: ["legs", "glutes"],
        tags: ["lower-body", "squat"],
      },
    ],
  },

  flexibility: {
    planName: "Flexibility & Mobility Plan",
    days: [
      {
        day: "tuesday",
        focus: "Upper Body Mobility",
        muscleGroups: ["shoulders", "back", "chest"],
        tags: ["mobility", "stretch", "warmup"],
      },
      {
        day: "thursday",
        focus: "Core & Stability",
        muscleGroups: ["core", "full_body"],
        tags: ["stability", "balance", "control"],
      },
      {
        day: "saturday",
        focus: "Lower Body Stretch",
        muscleGroups: ["legs", "glutes"],
        tags: ["mobility", "stretch", "flexibility"],
      },
    ],
  },

  general_fitness: {
    planName: "General Fitness Plan",
    days: [
      {
        day: "monday",
        focus: "Upper Body",
        muscleGroups: ["chest", "back", "shoulders", "arms"],
        tags: ["upper-body", "push", "pull"],
      },
      {
        day: "wednesday",
        focus: "Core & Cardio",
        muscleGroups: ["core", "cardio", "full_body"],
        tags: ["cardio", "abs", "hiit"],
      },
      {
        day: "friday",
        focus: "Lower Body",
        muscleGroups: ["legs", "glutes"],
        tags: ["lower-body", "squat", "lunge"],
      },
    ],
  },
};

// ── Exercise count per session based on duration ──────────────────────────────
function getExerciseCount(workoutDuration) {
  if (workoutDuration <= 20) return 3;
  if (workoutDuration <= 30) return 4;
  if (workoutDuration <= 45) return 5;
  return 6;
}

// ── Pick exercises for a day ──────────────────────────────────────────────────
function pickExercises(allExercises, muscleGroups, difficulty, count, usedIds = new Set()) {
  // Filter by muscle groups + difficulty
  const pool = allExercises.filter(
    (ex) =>
      muscleGroups.includes(ex.muscle_group) &&
      ex.difficulty === difficulty &&
      !usedIds.has(ex.id)
  );

  // If not enough exercises at exact difficulty, relax to adjacent levels
  let extended = [...pool];
  if (extended.length < count) {
    const fallback = allExercises.filter(
      (ex) =>
        muscleGroups.includes(ex.muscle_group) &&
        !usedIds.has(ex.id) &&
        !pool.find((p) => p.id === ex.id)
    );
    extended = [...pool, ...fallback];
  }

  // Shuffle and pick `count` exercises
  const shuffled = extended.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  // Mark as used to avoid repeating across days
  picked.forEach((ex) => usedIds.add(ex.id));

  return picked;
}

// ── Adjust sets/reps per difficulty ──────────────────────────────────────────
function adjustSetsReps(exercise, difficulty) {
  const overrides = {
    beginner: { sets: 2, repsMultiplier: 0.8 },
    intermediate: { sets: 3, repsMultiplier: 1.0 },
    advanced: { sets: 4, repsMultiplier: 1.2 },
  };

  const config = overrides[difficulty] || overrides.intermediate;

  return {
    sets: config.sets,
    reps: exercise.default_reps,       // keep reps as-is (already appropriate)
    duration_seconds: exercise.duration_seconds,
  };
}

// ── ALL DAYS of the week ───────────────────────────────────────────────────────
const ALL_DAYS = [
  "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday", "sunday",
];

// ── Main generator function ───────────────────────────────────────────────────
// @param {Object} profile    - user's profile row
// @param {Array}  exercises  - all exercises from DB
// @returns {Object}          - structured plan ready for DB insertion
export function generateWorkoutPlan(profile, exercises) {
  const { fitness_goal, activity_level, workout_duration } = profile;

  const config = PLAN_CONFIGS[fitness_goal] || PLAN_CONFIGS.general_fitness;
  const exerciseCount = getExerciseCount(workout_duration);
  const usedIds = new Set();

  // Workout days
  const workoutDayNames = config.days.map((d) => d.day);

  // Build all 7 days
  const days = ALL_DAYS.map((day, index) => {
    const isRestDay = !workoutDayNames.includes(day);

    if (isRestDay) {
      return {
        day,
        is_rest_day: true,
        focus: "Rest & Recovery",
        order_index: index,
        exercises: [],
      };
    }

    const dayConfig = config.days.find((d) => d.day === day);

    const picked = pickExercises(
      exercises,
      dayConfig.muscleGroups,
      activity_level,
      exerciseCount,
      usedIds
    );

    return {
      day,
      is_rest_day: false,
      focus: dayConfig.focus,
      order_index: index,
      exercises: picked.map((ex, i) => ({
        exercise_id: ex.id,
        order_index: i,
        ...adjustSetsReps(ex, activity_level),
      })),
    };
  });

  return {
    name: config.planName,
    goal: fitness_goal,
    days,
  };
}