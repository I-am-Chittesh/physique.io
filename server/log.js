const express = require('express');
const router = express.Router();
const pool = require('./db');

// 1. GET ALL FOODS (For the Search Dropdown)
router.get('/foods', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM food_items ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error fetching foods" });
    }
});

// 2. SAVE A LOG ENTRY
router.post('/add', async (req, res) => {
    const { userId, foodId, quantity, metPlan, cardioMins } = req.body;

    // We can log FOOD or CARDIO or BOTH.
    // If foodId is present, we log food.
    
    try {
        let newLog;

        if (foodId) {
            // Log Food Entry
            const foodQuery = `
                INSERT INTO daily_logs (user_id, food_id, quantity, met_plan, date)
                VALUES ($1, $2, $3, $4, CURRENT_DATE)
                RETURNING *;
            `;
            const result = await pool.query(foodQuery, [userId, foodId, quantity || 1, metPlan]);
            newLog = result.rows[0];
        }

        if (cardioMins > 0) {
            // Log Cardio (We treat this as a separate entry or update the day's total)
            // For MVP, we just insert a row with null food_id representing cardio
            const cardioQuery = `
                INSERT INTO daily_logs (user_id, cardio_minutes, date, met_plan)
                VALUES ($1, $2, CURRENT_DATE, $3)
                RETURNING *;
            `;
            await pool.query(cardioQuery, [userId, cardioMins, metPlan]);
        }

        res.json({ message: "Activity Logged Successfully", log: newLog });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error saving log" });
    }
});

module.exports = router;