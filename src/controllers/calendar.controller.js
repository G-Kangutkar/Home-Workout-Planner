
import { google } from "googleapis";
import supabase from "../config/supabase.config.js";

// ── Helper: build OAuth2 client ───────────────────────────────────────────────
function getOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// ── Helper: format a date+time into Google Calendar dateTime ─────────────────
function buildDateTime(dayOffset, timeStr) {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + dayOffset);

    const year  = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, "0");
    const date  = String(monday.getDate()).padStart(2, "0");

    const [hours, minutes] = timeStr.split(":");
    return `${year}-${month}-${date}T${hours}:${minutes}:00`;
}

// ── GET /api/calendar/auth-url ────────────────────────────────────────────────
export const getAuthUrl = (req, res) => {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar",
        ],
        state: req.user.id,
    });
    res.json({ url });
};

// ── GET /api/calendar/callback ────────────────────────────────────────────────
export const handleCallback = async (req, res) => {
    const { code, state } = req.query;
    const userId = state;

    if (!code)   return res.status(400).json({ error: "Missing code" });
    if (!userId) return res.status(400).json({ error: "Missing user state" });

    try {
        const oauth2Client = getOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        await supabase
            .from("profile")
            .update({
                google_access_token:   tokens.access_token,
                google_refresh_token:  tokens.refresh_token || null,
                calendar_sync_enabled: true,
            })
            .eq("user_id", userId);

        res.redirect(`${process.env.FRONTEND_URL}/workout?calendar=connected`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/calendar/sync ───────────────────────────────────────────────────
export const syncCalendar = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Get profile (tokens + time preferences)
        const { data: profile, error: profileErr } = await supabase
            .from("profile")
            .select("google_access_token, google_refresh_token, preferred_workout_time, preferred_meal_time, calendar_sync_enabled")
            .eq("user_id", userId)
            .single();

        if (profileErr || !profile) return res.status(404).json({ error: "Profile not found" });
        if (!profile.calendar_sync_enabled || !profile.google_access_token) {
            return res.status(400).json({ error: "Calendar not connected" });
        }

        // 2. Get active workout plan
        const { data: planData } = await supabase
            .from("workout_plans")
            .select(`
                *,
                days:workout_plan_days (
                    *,
                    exercises:plan_day_exercises (
                        *,
                        exercise:exercises ( name, muscle_group )
                    )
                )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!planData) return res.status(404).json({ error: "No workout plan found" });

        // 3. Get nutrition plan via user's fitness goal
        const { data: profileGoal } = await supabase
            .from("profile")
            .select("fitness_goal")
            .eq("user_id", userId)
            .single();

        const { data: nutritionPlan } = await supabase
            .from("nutrition_plans")
            .select("*")
            .eq("goal", profileGoal?.fitness_goal || "general_fitness")
            .maybeSingle();

        // 4. Build OAuth client with saved tokens
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({
            access_token:  profile.google_access_token,
            refresh_token: profile.google_refresh_token,
        });

        oauth2Client.on("tokens", async (tokens) => {
            if (tokens.access_token) {
                await supabase
                    .from("profile")
                    .update({ google_access_token: tokens.access_token })
                    .eq("user_id", userId);
            }
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const DAY_MAP = {
            monday: 0, tuesday: 1, wednesday: 2,
            thursday: 3, friday: 4, saturday: 5, sunday: 6,
        };

        const createdEvents = [];

        // 5. Create workout events for each day
        for (const day of planData.days) {
            const dayOffset   = DAY_MAP[day.day] ?? 0;
            const workoutTime = (profile.preferred_workout_time || "07:00:00").slice(0, 5);
            const durationMin = planData.workout_duration || 45;

            const startTime = buildDateTime(dayOffset, workoutTime);

            const [startH, startM] = workoutTime.split(":").map(Number);
            const endTotalMin = startH * 60 + startM + durationMin;
            const endH = String(Math.floor(endTotalMin / 60) % 24).padStart(2, "0");
            const endM = String(endTotalMin % 60).padStart(2, "0");
            const endTime = `${startTime.split("T")[0]}T${endH}:${endM}:00`;

            let title       = "";
            let description = "";
            let colorId     = "2";

            if (day.is_rest_day) {
                title       = "🛌 Rest & Recovery Day";
                description = "Active recovery day.\n\n💧 Stay hydrated\n🧘 Light stretching\n😴 Sleep 7–9 hours";
                colorId     = "8";
            } else {
                const exerciseList = day.exercises
                    ?.map((ex) => `• ${ex.exercise?.name || "Exercise"} — ${ex.sets} sets × ${ex.reps} reps`)
                    .join("\n") || "";

                title       = `💪 ${day.focus || day.day} Workout`;
                description = `Workout Plan: ${planData.name || "Weekly Plan"}\nFocus: ${day.focus || "General"}\nDuration: ${durationMin} min\n\nExercises:\n${exerciseList}`;
                colorId     = "2";
            }

            const event = await calendar.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary:     title,
                    description,
                    colorId,
                    start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
                    end:   { dateTime: endTime,   timeZone: "Asia/Kolkata" },
                    reminders: {
                        useDefault: false,
                        overrides: [{ method: "popup", minutes: 30 }],
                    },
                },
            });

            createdEvents.push({ type: "workout", day: day.day, eventId: event.data.id });
        }

        // 6. Create meal prep events if nutrition plan exists
        if (nutritionPlan) {
            const mealTime = (profile.preferred_meal_time || "08:00:00").slice(0, 5);
            const mealDays = [0, 2, 4]; // Mon, Wed, Fri

            for (const dayOffset of mealDays) {
                const startTime = buildDateTime(dayOffset, mealTime);

                const [h, m]      = mealTime.split(":").map(Number);
                const endTotalMin = h * 60 + m + 30;
                const endH        = String(Math.floor(endTotalMin / 60) % 24).padStart(2, "0");
                const endM        = String(endTotalMin % 60).padStart(2, "0");
                const endTime     = `${startTime.split("T")[0]}T${endH}:${endM}:00`;

                const event = await calendar.events.insert({
                    calendarId: "primary",
                    requestBody: {
                        summary:     "🥗 Meal Prep",
                        description: `Nutrition Plan: ${nutritionPlan.label || "Healthy eating"}\nCalories: ${nutritionPlan.calories || "–"} kcal/day\nProtein: ${nutritionPlan.protein_pct || "–"}% | Carbs: ${nutritionPlan.carbs_pct || "–"}% | Fat: ${nutritionPlan.fat_pct || "–"}%\n${nutritionPlan.description || ""}`,
                        colorId:     "5",
                        start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
                        end:   { dateTime: endTime,   timeZone: "Asia/Kolkata" },
                        reminders: {
                            useDefault: false,
                            overrides: [{ method: "popup", minutes: 15 }],
                        },
                    },
                });

                createdEvents.push({ type: "meal", dayOffset, eventId: event.data.id });
            }
        }

        res.json({
            success:       true,
            eventsCreated: createdEvents.length,
            events:        createdEvents,
        });

    } catch (err) {
        console.error("Calendar sync error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/calendar/status ──────────────────────────────────────────────────
export const getCalendarStatus = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data } = await supabase
            .from("profile")
            .select("calendar_sync_enabled, preferred_workout_time, preferred_meal_time")
            .eq("user_id", userId)
            .single();

        res.json({
            connected:              data?.calendar_sync_enabled  || false,
            preferred_workout_time: data?.preferred_workout_time || "07:00:00",
            preferred_meal_time:    data?.preferred_meal_time    || "08:00:00",
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── PUT /api/calendar/preferences ─────────────────────────────────────────────
export const updatePreferences = async (req, res) => {
    const userId = req.user.id;
    const { preferred_workout_time, preferred_meal_time } = req.body;

    try {
        await supabase
            .from("profile")
            .update({ preferred_workout_time, preferred_meal_time })
            .eq("user_id", userId);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── DELETE /api/calendar/disconnect ───────────────────────────────────────────
export const disconnectCalendar = async (req, res) => {
    const userId = req.user.id;
    try {
        await supabase
            .from("profile")
            .update({
                google_access_token:   null,
                google_refresh_token:  null,
                calendar_sync_enabled: false,
            })
            .eq("user_id", userId);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};