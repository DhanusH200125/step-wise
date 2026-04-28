import pg from 'pg';

const { Pool } = pg;


// Configure the PostgreSQL connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});


// Helper function to convert snake_case strings to camelCase
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

// Transforms database row keys from snake_case to camelCase
function transformRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [snakeToCamel(k), v])
  );
}


// Standard query wrapper that auto-transforms snake_case results to camelCase
export async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return { ...res, rows: res.rows.map(transformRow) };
}

export async function rawQuery(sql, params = []) {
  const res = await pool.query(sql, params);
  return res;
}

// Initializes the database schema and performs necessary migrations
export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');


    // Create Users table to store authentication and profile data
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                   SERIAL PRIMARY KEY,
        name                 VARCHAR(255)  NOT NULL,
        email                VARCHAR(255)  UNIQUE NOT NULL,
        password             VARCHAR(255)  NOT NULL,
        role                 VARCHAR(50)   DEFAULT 'student',
        timezone             VARCHAR(100)  DEFAULT 'Asia/Kolkata',
        growth_target_hours  INTEGER       DEFAULT 10,
        preferences          JSONB         DEFAULT '{}',
        onboarding_completed BOOLEAN       DEFAULT FALSE,
        created_at           TIMESTAMPTZ   DEFAULT NOW(),
        updated_at           TIMESTAMPTZ   DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER      REFERENCES users(id) ON DELETE CASCADE,
        title            VARCHAR(500) NOT NULL,
        domain           VARCHAR(100),
        priority         INTEGER      DEFAULT 2,
        status           VARCHAR(20)  DEFAULT 'pending',
        duration         INTEGER      DEFAULT 30,
        actual_duration  INTEGER,
        energy           VARCHAR(20)  DEFAULT 'medium',
        flexibility      VARCHAR(10)  DEFAULT 'soft',
        deadline         TIMESTAMPTZ,
        completed_at     TIMESTAMPTZ,
        skipped_at       TIMESTAMPTZ,
        started_at       TIMESTAMPTZ,
        reschedule_count INTEGER      DEFAULT 0,
        created_at       TIMESTAMPTZ  DEFAULT NOW(),
        updated_at       TIMESTAMPTZ  DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS routines (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER      REFERENCES users(id) ON DELETE CASCADE,
        title        VARCHAR(255) NOT NULL,
        type         VARCHAR(50)  DEFAULT 'daily',
        day_of_week  INTEGER      CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time   TIME,
        end_time     TIME,
        color        VARCHAR(20)  DEFAULT '#3b82f6',
        created_at   TIMESTAMPTZ  DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER     REFERENCES users(id) ON DELETE CASCADE,
        task_id         INTEGER     REFERENCES tasks(id) ON DELETE CASCADE,
        scheduled_slot  TIMESTAMPTZ NOT NULL,
        locked_flag     BOOLEAN     DEFAULT FALSE,
        score           INTEGER     DEFAULT 0,
        score_breakdown JSONB       DEFAULT '{}',
        status          VARCHAR(20) DEFAULT 'scheduled',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER     REFERENCES users(id) ON DELETE CASCADE,
        week_start_date  DATE        NOT NULL,
        metrics          JSONB       DEFAULT '{}',
        domain_breakdown JSONB       DEFAULT '[]',
        insights         JSONB       DEFAULT '[]',
        growth_data      JSONB       DEFAULT '{}',
        suggestions      JSONB       DEFAULT '[]',
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, week_start_date)
      );
    `);


    // Create logs table for tracking task actions and durations
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER      REFERENCES users(id) ON DELETE CASCADE,
        task_id          INTEGER      REFERENCES tasks(id) ON DELETE SET NULL,
        action_type      VARCHAR(100),
        metadata         JSONB        DEFAULT '{}',
        planned_duration INTEGER,
        actual_duration  INTEGER,
        created_at       TIMESTAMPTZ  DEFAULT NOW()
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER     REFERENCES users(id) ON DELETE CASCADE,
        type             VARCHAR(100),
        message          TEXT,
        is_read          BOOLEAN     DEFAULT FALSE,
        related_task_id  INTEGER     REFERENCES tasks(id) ON DELETE SET NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    await client.query(`
  DO $$ BEGIN
    -- Only run if priority is still stored as text (varchar)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks'
        AND column_name = 'priority'
        AND data_type = 'character varying'
    ) THEN
      -- Drop the default first to avoid cast conflict
      ALTER TABLE tasks ALTER COLUMN priority DROP DEFAULT;
      ALTER TABLE tasks ALTER COLUMN priority TYPE INTEGER
        USING CASE LOWER(priority::text)
          WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 2
        END;
      ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 2;
    END IF;
  END $$;
`);


    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='tasks' AND column_name='flexibility' AND data_type='integer'
        ) THEN
          ALTER TABLE tasks ALTER COLUMN flexibility TYPE VARCHAR(10) USING
            CASE WHEN flexibility >= 50 THEN 'hard' ELSE 'soft' END;
          ALTER TABLE tasks ALTER COLUMN flexibility SET DEFAULT 'soft';
        END IF;
      END $$;
    `);


    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='skipped_at') THEN
          ALTER TABLE tasks ADD COLUMN skipped_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='started_at') THEN
          ALTER TABLE tasks ADD COLUMN started_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='notifications' AND column_name='related_task_id'
        ) THEN
          ALTER TABLE notifications
            ADD COLUMN related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);


    // Ensure all critical foreign keys and filter columns are indexed
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id        ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status         ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_domain         ON tasks(domain);
      CREATE INDEX IF NOT EXISTS idx_schedules_user_id    ON schedules(user_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_slot       ON schedules(scheduled_slot);
      CREATE INDEX IF NOT EXISTS idx_schedules_status     ON schedules(status);
      CREATE INDEX IF NOT EXISTS idx_logs_user_id         ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_action_type     ON logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_taskid ON notifications(related_task_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_skipped_at     ON tasks(skipped_at);
      CREATE INDEX IF NOT EXISTS idx_routines_user_id     ON routines(user_id);
    `);

    await client.query('COMMIT');
    console.log('[DB] Schema ready ✅');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] initDatabase failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}


let _initPromise = null;

// Ensures the database is initialized before processing requests (singleton promise)
export const ensureDatabase = () => {
  if (!_initPromise) {
    _initPromise = initDatabase().catch(err => {
      console.error('[DB] Auto-init failed — will retry on next request:', err.message);
      _initPromise = null;
    });
  }
  return _initPromise;
};


ensureDatabase();

export default pool;
