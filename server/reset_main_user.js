const pool = require('./db');

(async () => {
  try {
    const result = await pool.query('DELETE FROM profiles WHERE username = $1 RETURNING *', ['main']);
    console.log('Deleted rows:', result.rowCount);
    if (result.rows.length > 0) {
      console.log('Deleted user:', result.rows[0]);
    } else {
      console.log('No user named "main" found.');
    }
  } catch (err) {
    console.error('Error deleting user:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
