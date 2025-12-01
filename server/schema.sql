-- 1. Create the Table
CREATE TABLE IF NOT EXISTS food_items (
    id SERIAL PRIMARY KEY,
    name TEXT,
    calories INTEGER,
    protein INTEGER,
    unit_type TEXT
);

-- 2. Add the Data
INSERT INTO food_items (name, calories, protein, unit_type) VALUES
('Moms Idli', 60, 2, 'Piece'),
('Soya Varuval', 180, 12, 'Cup'),
('White Rice', 150, 3, 'Ladle'),
('Tamil Hulk Shake', 850, 30, 'Glass');