import supabase from "../config/supabase.config.js"

export const getNutritionPlan = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profile').select('fitness_goal').eq('user_id', req.user.id).maybeSingle();

        if (error) return res.status(400).json({ error: error.message });
        if (!data?.fitness_goal) return res.status(404).json({ error: "No fitness goal set in profile" });

        const goal = data.fitness_goal;
        console.log(goal)

        const [planResp, mealResp, tipsResp] = await Promise.all([
            supabase.from('nutrition_plans').select('*').eq('goal', goal),
            supabase.from('nutrition_meals').select('*').eq('plan_goal', goal).order("meal_time", { ascending: true }),
            supabase.from('nutrition_prep_tips').select('*').eq('plan_goal', goal),

        ])

        if (planResp.error) return res.status(400).json({ error: planResp.error.message })
        if (mealResp.error) return res.status(400).json({ error: mealResp.error.message });

        res.json({
            plan: planResp.data,
            meals: mealResp.data,
            prepTips: tipsResp.data?.map((t) => t.tip) || [],
        });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }

}