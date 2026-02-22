import supabase from "../config/supabase.config.js";
// import admin from "../config/firebase.config.js";



export const setReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { remindTime } = req.body;   // "HH:MM"

    if (!remindTime) {
      return res.status(400).json({ error: "remindTime is required" });
    }

    const { data: existing } = await supabase
      .from("reminders")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Update existing reminder
      const { error } = await supabase
        .from("reminders")
        .update({ remind_time: remindTime, is_active: true, sent_today: false })
        .eq("user_id", userId);

      if (error) return res.status(400).json({ error: error.message });
    } else {
      // Insert new reminder
      const { error } = await supabase
        .from("reminders")
        .insert({ user_id: userId, remind_time: remindTime, is_active: true, sent_today: false });

      if (error) return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const saveToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const { error } = await supabase
      .from("profile")
      .update({ fcm_token: token })
      .eq("user_id", userId);          

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};