const express = require('express');
const router = express.Router(); // This is the standard way to group routes
const bcrypt = require('bcrypt');
const pool = require('./db'); // Our database connection

// === CONFIGURATION ===
const saltRounds = 10; // Standard salt for security

// ----------------------------------------------------
// ➡️ ROUTE 1: SIGNUP (POST /auth/signup)
// ----------------------------------------------------

router.post('/signup', async (req, res) => {
    // 1. Destructure the inputs from the frontend
    const { username, password } = req.body;

    // Basic check for required fields
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // 2. Hash the Password (The Security Step)
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Save the new profile into the database
        const newUserQuery = `
            INSERT INTO profiles (username, password)
            VALUES ($1, $2)
            RETURNING id, username, target_calories; 
        `;
        
        const result = await pool.query(newUserQuery, [username, hashedPassword]);
        const newUser = result.rows[0];

        // 4. Send back the profile (without the password!)
        res.status(201).json({ 
            message: 'User created successfully. Proceed to plan setup.',
            user: { id: newUser.id, username: newUser.username }
        });

    } catch (err) {
        // Handles errors like duplicate username (if we had a unique constraint)
        console.error('Signup Error:', err);
        // Postgres unique-violation error code is 23505
        if (err && err.code === '23505') {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: 'Failed to create user account.' });
    }
});


// ----------------------------------------------------
// ➡️ ROUTE 2: LOGIN (POST /auth/login)
// ----------------------------------------------------

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Fetch the user from the database
        const userQuery = `SELECT * FROM profiles WHERE username = $1`;
        const result = await pool.query(userQuery, [username]);
        const user = result.rows[0];

        // 2. Check if the user exists
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // 3. Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);

        // 4. Check password match
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // 5. Success! Send back profile data (excluding sensitive info)
        res.json({ 
            message: 'Login successful.',
            user: {
                id: user.id,
                username: user.username,
                calories_target: user.target_calories,
                // Check if the plan is set for onboarding redirection
                plan_set: user.weekly_diet_plan && Object.keys(user.weekly_diet_plan).length > 0 
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});


module.exports = router;