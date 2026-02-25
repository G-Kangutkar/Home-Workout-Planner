import supabase from "../config/supabase.config.js";

const VALID_GOALS    = ["weight_loss", "flexibility", "general_fitness", "muscle_gain"];
const VALID_SECTIONS = ["post_workout", "sleep", "stretching"];

export const getRecoveryGuide = async (req, res) => {
  try {
    const { goal } = req.params;

    if (!VALID_GOALS.includes(goal)) {
      return res.status(400).json({
        error: `Invalid goal. Must be one of: ${VALID_GOALS.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("recovery_guides")
      .select("id, section, title, description, duration, sort_order")
      .eq("goal", goal)
      .order("section",     { ascending: true })
      .order("sort_order",  { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // Group rows by section so frontend gets a clean object
    // { post_workout: [...], sleep: [...], stretching: [...] }
    const grouped = VALID_SECTIONS.reduce((acc, section) => {
      acc[section] = data.filter((row) => row.section === section);
      return acc;
    }, {});

    res.status(200).json({ goal, sections: grouped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};