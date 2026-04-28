import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5432/STEPWISEDB',
});

async function check() {
  try {
    const res = await pool.query("SELECT id, title, status, started_at, skipped_at FROM tasks WHERE status = 'in_progress' OR skipped_at IS NOT NULL LIMIT 5;");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
