// server/lib/calorieCalculator.js
// ─────────────────────────────────────────────────────────────────
// Calculate calories burned using MET formula
// Calories = MET × Weight(kg) × Duration(hours)
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate calories burned for a single exercise
 * @param {number} met - Metabolic Equivalent (e.g. 3.8 for push-ups)
 * @param {number} weight - User weight in kg
 * @param {number} sets - Number of sets performed
 * @param {number} reps - Reps per set (if applicable)
 * @param {number} durationSeconds - Duration per set in seconds (for timed exercises)
 * @returns {number} Total calories burned
 */
export function calculateExerciseCalories(met, weight, sets, reps, durationSeconds) {
  
  // If it's a timed exercise (plank, etc.)
  if (durationSeconds) {
    const totalSeconds = sets * durationSeconds;
    const hours = totalSeconds / 3600;
    return met * weight * hours;
  }
  
  // If it's a rep-based exercise (push-ups, squats etc.)
  // Estimate: 1 rep = 3 seconds on average
  const secondsPerRep = 3;
  const totalReps = sets * (parseInt(reps) || 10); // default 10 if reps is "10-12"
  const totalSeconds = totalReps * secondsPerRep;
  const hours = totalSeconds / 3600;
  return met * weight * hours;
}

/**
 * Calculate total calories for a full workout day
 * @param {Array} exercises - Array of exercise objects from plan
 * @param {number} weight - User weight in kg
 * @returns {number} Total calories burned for the day
 */
export function calculateDayCalories(exercises, weight) {
  return exercises.reduce((total, ex) => {
    const met = ex.exercise?.met_value || 5.0; // default MET if missing
    const sets = ex.sets || 3;
    const reps = ex.reps || "10";
    const duration = ex.duration_seconds || ex.exercise?.duration_seconds;
    
    const calories = calculateExerciseCalories(met, weight, sets, reps, duration);
    return total + calories;
  }, 0);
}

/**
 * Get estimated calories per minute for real-time tracking
 * @param {number} met - Metabolic Equivalent
 * @param {number} weight - User weight in kg
 * @returns {number} Calories per minute
 */
export function getCaloriesPerMinute(met, weight) {
  const hours = 1 / 60; // 1 minute in hours
  return met * weight * hours;
}