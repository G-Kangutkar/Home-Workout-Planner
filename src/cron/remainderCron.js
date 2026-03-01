// src/cron/reminderCron.js
import cron from "node-cron";
import supabase from "../config/supabase.config.js";
import admin from "../firebase/firebaseAdmin.js";

// Runs every minute — checks if any reminder's time matches current time
export function startReminderCron() {
  cron.schedule("* * * * *", async () => {
    try {
      // Get current time as "HH:MM" in UTC (or your server timezone)
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;  // "HH:MM" in UTC
      const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD" — this is fine as is     // "YYYY-MM-DD"
// console.log("[Cron] Tick —", currentTime);
      // Find all active reminders that match current time and haven't fired today
      const { data: reminders, error } = await supabase
        .from("reminders")
        .select("id, user_id, remind_time")
        .eq("is_active", true)
        .eq("sent_today", false)
        // .eq("remind_time", `${currentTime}:00`);   // "07:30" matches "07:30:00"

      if (error) {
        console.error("Cron query error:", error.message);
        return;
      }

      if (!reminders?.length) return;

      console.log(`[Cron] ${currentTime} — ${reminders.length} reminder(s) to send`);

      for (const reminder of reminders) {

        const { data: profile } = await supabase
          .from("profile")
          .select("fcm_token")
          .eq("user_id", reminder.user_id)
          .single();
        const fcmToken = profile?.fcm_token;

        if (!fcmToken) {
          console.warn(`[Cron] No FCM token for user ${reminder.user_id}`);
          continue;
        }
//         console.log("Sending to token:", fcmToken?.slice(0, 20), "...");
// console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
// console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
// console.log("Private Key exists:", !!process.env.FIREBASE_PRIVATE_KEY);
        try {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: "Workout Time 💪",
              body: "Your daily workout session starts now! Let's go!",
            },
            webpush: {
              notification: {
                icon: "/logo192.png",
                badge: "/logo192.png",
              },
            },
          });

          // Mark as sent for today
          await supabase
            .from("reminders")
            .update({ sent_today: true, last_sent: today })
            .eq("id", reminder.id);

          console.log(`[Cron] ✅ Sent reminder to user ${reminder.user_id}`);

        } catch (sendErr) {
          // Token might be expired/invalid — deactivate it
          if (sendErr.code === "messaging/invalid-registration-token" ||
            sendErr.code === "messaging/registration-token-not-registered") {
            console.warn(`[Cron] Invalid token for user ${reminder.user_id} — clearing`);
            await supabase
              .from("profile")
              .update({ fcm_token: null })
              .eq("id", reminder.user_id);
          } else {
            console.error(`[Cron] Send error for user ${reminder.user_id}:`, sendErr.message);
          }
        }
      }

    } catch (err) {
      console.error("[Cron] Unexpected error:", err.message);
    }
  });

  console.log("[Cron] Reminder cron started ✅");
}


// Every day at midnight — reset sent_today so reminders fire again
cron.schedule("0 0 * * *", async () => {
  const { error } = await supabase
    .from("reminders")
    .update({ sent_today: false })
    .eq("is_active", true);

  if (error) console.error("[Cron] Reset error:", error.message);
  else console.log("[Cron] 🔄 Reset sent_today for all active reminders");
});