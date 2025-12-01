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


module.exports = router;