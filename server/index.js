const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log("1. Server is initializing...");

// Test Route
app.get('/', (req, res) => {
    res.send("Physique.io Brain is Active! 🧠");
});

// Database Route
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM food_items');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

console.log("2. Routes are set up...");

// START THE SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("3. SUCCESS! Server is running on port " + PORT);
});