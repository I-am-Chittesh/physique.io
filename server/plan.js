const express = require('express');
const router = express.Router();
const pool = require('./db');

// ----------------------------------------------------
// ➡️ ROUTE 1: SAVE WEEKLY PLAN (POST /user/setup-plan)
// ----------------------------------------------------

router.post('/setup-plan', async (req, res) => {
    // We expect the user ID, the plan, and goals from the onboarding screens
    const { userId, dietPlan, workoutPlan, targetCalories, targetProtein } = req.body;

    // Quick check to ensure we have the minimum required data
    if (!userId || !dietPlan || !workoutPlan) {
        return res.status(400).json({ error: 'Missing required plan data or user ID.' });
    }

    try {
        // SQL: Update the profiles table with the new targets and the JSON plans.
        const updateQuery = `
            UPDATE profiles 
            SET weekly_diet_plan = $2, 
                weekly_workout_plan = $3,
                target_calories = $4,
                target_protein = $5
            WHERE id = $1
            RETURNING id, username; 
        `;
        
        // We must JSON.stringify the objects before sending them to PostgreSQL
        // since we defined the columns as JSONB.
        const result = await pool.query(updateQuery, [
            userId, 
            JSON.stringify(dietPlan), 
            JSON.stringify(workoutPlan),
            targetCalories,
            targetProtein
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found during plan update.' });
        }

        res.status(200).json({ 
            message: 'Weekly plan saved successfully.',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Plan Setup Error:', err);
        res.status(500).json({ error: 'Failed to save weekly plan.', details: err.message });
    }
});

// ----------------------------------------------------
// ➡️ ROUTE 3: GET DAILY SUMMARY AND TARGETS (GET /user/summary/:id)
// ----------------------------------------------------
router.get('/summary/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch User Profile and Today's Logged Totals
        // This SQL query joins profiles (targets) with daily_logs (actual consumption)
        const summaryQuery = `
            SELECT 
                p.username,
                p.target_calories, 
                p.target_protein,
                p.weekly_diet_plan,
                p.weekly_workout_plan,
                COALESCE(SUM(l.quantity * f.calories), 0) AS calories_consumed,
                COALESCE(SUM(l.quantity * f.protein), 0) AS protein_consumed,
                (SELECT COUNT(*) FROM daily_logs WHERE user_id = $1 AND met_plan = TRUE) AS adherence_score
            FROM profiles p
            LEFT JOIN daily_logs l ON p.id = l.user_id AND l.date = CURRENT_DATE
            LEFT JOIN food_items f ON l.food_id = f.id
            WHERE p.id = $1
            GROUP BY p.id;
        `;
        
        const result = await pool.query(summaryQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found or plan is missing.' });
        }
        
        // 2. Process and send the final data
        const data = result.rows[0];
        
        // Simple adherence score based on total logs, this will be improved later
        const adherenceScore = parseInt(data.adherence_score);
        
        res.json({
            username: data.username,
            today_plan_diet: data.weekly_diet_plan[new Date().toLocaleDateString('en-US', { weekday: 'long' })] || "No plan set",
            today_plan_workout: data.weekly_workout_plan[new Date().toLocaleDateString('en-US', { weekday: 'long' })] || "Rest Day",
            targets: {
                calories: data.target_calories,
                protein: data.target_protein
            },
            actuals: {
                calories: parseFloat(data.calories_consumed),
                protein: parseFloat(data.protein_consumed),
            },
            streak: adherenceScore // Placeholder for the actual streak calculation
        });

    } catch (err) {
        console.error('Daily Summary Fetch Error:', err);
        res.status(500).json({ error: 'Server error calculating summary.' });
    }
});

module.exports = router;