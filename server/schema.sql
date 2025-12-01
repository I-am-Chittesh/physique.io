-- DAY 2 FIX: Complete Schema Setup
-- Drop in reverse order to respect foreign key constraints
DROP TABLE IF EXISTS daily_logs;
DROP TABLE IF EXISTS workout_session;
DROP TABLE IF EXISTS weight_log;
DROP TABLE IF EXISTS food_items;
DROP TABLE IF EXISTS profiles;

-- 1. Profiles Table (User Settings & Plans)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE, -- Added UNIQUE constraint to prevent duplicate usernames
    password TEXT,
    target_calories INTEGER DEFAULT 2400,
    target_protein INTEGER DEFAULT 100,
    weekly_diet_plan JSONB DEFAULT '{}'::jsonb,
    weekly_workout_plan JSONB DEFAULT '{}'::jsonb
);

-- 2. Food Items Table
CREATE TABLE food_items (
    id SERIAL PRIMARY KEY,
    name TEXT,
    calories INTEGER,
    protein INTEGER,
    unit_type TEXT
);

-- 3. Daily Logs Table
CREATE TABLE daily_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    date DATE DEFAULT CURRENT_DATE,
    food_id INTEGER REFERENCES food_items(id),
    quantity INTEGER,
    met_plan BOOLEAN DEFAULT FALSE,
    cardio_minutes INTEGER DEFAULT 0
);

-- 4. Weight Tracking (The 75kg Goal)
CREATE TABLE weight_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    log_date DATE DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5, 2) NOT NULL
);

-- 5. Workout Sessions (Activity Tracking)
CREATE TABLE workout_session (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    session_date DATE DEFAULT CURRENT_DATE,
    workout_name TEXT,
    duration_mins INTEGER,
    intensity_rating INTEGER
);


-- 6. Seed Data (Re-populate Menu)
INSERT INTO food_items (name, calories, protein, unit_type) VALUES
('Moms Idli', 60, 2, 'Piece'),
('Mushroom Pepper Fry', 140, 6, 'Cup'),
('White Rice', 150, 3, 'Ladle'),
('Tamil Hulk Shake', 850, 30, 'Glass'),
('Paneer Butter Masala', 250, 8, 'Cup'),
('Dosa', 120, 3, 'Piece');