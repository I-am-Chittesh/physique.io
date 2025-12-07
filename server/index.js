const express = require('express');
const logRouter = require('./log');
const statsRouter = require('./stats');
const cors = require('cors');
const pool = require('./db');
const authRouter = require('./auth');
const planRouter = require('./plan'); // ⬅️ NEW: Import Plan Routes
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---------------- ROUTES ---------------- //

// Mount Routers
app.use('/auth', authRouter);
app.use('/user', planRouter); // ⬅️ NEW: Server knows about /user/setup-plan
app.use('/log', logRouter);
app.use('/stats', statsRouter);
// Test Route: Check if server is alive
app.get('/', (req, res) => {
    res.send("Physique.io Brain is Active! 🧠");
});

// Test Database: Fetch all food items (for quick check)
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM food_items');
        res.json(result.rows);
    } catch (err) {
        console.error('DB Test Failed:', err.message);
        res.status(500).send("Server Error: Check terminal for details.");
    }
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});