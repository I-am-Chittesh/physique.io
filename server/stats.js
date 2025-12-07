const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET USER STATS (Streak Grid + Weight History)
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch Plan Adherence (The GitHub Grid Data)
        // We get every date where you said "Yes" to the plan
        const logsQuery = `
            SELECT date, met_plan 
            FROM daily_logs 
            WHERE user_id = $1 AND met_plan = TRUE
            ORDER BY date DESC
            LIMIT 365;
        `;
        const logsResult = await pool.query(logsQuery, [id]);

        // 2. Fetch Weight History (For the Graph)
        const weightQuery = `
            SELECT log_date, weight_kg 
            FROM weight_log 
            WHERE user_id = $1 
            ORDER BY log_date ASC;
        `;
        const weightResult = await pool.query(weightQuery, [id]);

        // 3. Calculate Current Streak (Simple Logic)
        // (In a real app, you'd use complex date math here)
        const streakCount = logsResult.rows.length; // Total successful days for now

        res.json({
            streak: streakCount,
            history: logsResult.rows, // Array of successful dates
            weights: weightResult.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error fetching stats" });
    }
});

module.exports = router;