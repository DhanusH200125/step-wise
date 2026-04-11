import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function init() {
  
  const createTables = `
    -- Users table with expanded preferences
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'Student',
      preferences JSONB DEFAULT '{}',
      growth_target_hours NUMERIC DEFAULT 5,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Routines table with category and color
    CREATE TABLE IF NOT EXISTS routines (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(100),
      label VARCHAR(100),
      day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME,
      end_time TIME,
      category VARCHAR(20) DEFAULT 'other',
      color VARCHAR(7) DEFAULT '#6B7280',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Tasks table with expanded fields
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      domain VARCHAR(30) DEFAULT 'Life Admin',
      priority INT DEFAULT 2,
      deadline DATE,
      duration INT,
      flexibility VARCHAR(10) DEFAULT 'soft',
      energy VARCHAR(10) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      actual_duration INT,
      reschedule_count INT DEFAULT 0,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Schedules table with scoring
    CREATE TABLE IF NOT EXISTS schedules (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
      scheduled_slot TIMESTAMP NOT NULL,
      locked_flag BOOLEAN DEFAULT false,
      score NUMERIC,
      score_breakdown JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Logs table with metadata
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      task_id INT REFERENCES tasks(id) ON DELETE SET NULL,
      action_type VARCHAR(50) NOT NULL,
      metadata JSONB DEFAULT '{}',
      planned_duration INT,
      actual_duration INT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      related_task_id INT REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Reports table with expanded fields
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      week_start_date DATE NOT NULL,
      metrics JSONB,
      domain_breakdown JSONB,
      insights JSONB,
      growth_data JSONB,
      suggestions JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, week_start_date)
    );
  `;

  try {
    await pool.query(createTables);
    console.log("✓ Tables created successfully");
  } catch (error) {
    console.error("Error creating tables", error.message);
  }

  
  const alterQueries = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS growth_target_hours NUMERIC DEFAULT 5",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'other'",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6B7280'",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS label VARCHAR(100)",
    "ALTER TABLE routines ADD COLUMN IF NOT EXISTS title VARCHAR(100)",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS flexibility VARCHAR(10) DEFAULT 'soft'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy VARCHAR(10) DEFAULT 'medium'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS domain VARCHAR(30) DEFAULT 'Life Admin'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_duration INT",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reschedule_count INT DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS score NUMERIC",
    "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'",
    "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled'",
    "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS locked_flag BOOLEAN DEFAULT false",
    "ALTER TABLE logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'",
    "ALTER TABLE logs ADD COLUMN IF NOT EXISTS planned_duration INT",
    "ALTER TABLE logs ADD COLUMN IF NOT EXISTS actual_duration INT",
    "ALTER TABLE logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS domain_breakdown JSONB",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS insights JSONB",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS growth_data JSONB",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS suggestions JSONB",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS week_start DATE",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
  ];

  let alterErrors = 0;
  for (const query of alterQueries) {
    try {
      await pool.query(query);
    } catch (e) {
      alterErrors++;
      
    }
  }
  console.log(`✓ Alter table migrations completed (${alterQueries.length - alterErrors} applied)`);

  
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_domain ON tasks(user_id, domain);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_logs_user_action ON logs(user_id, action_type);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_schedules_user_week ON schedules(user_id, scheduled_slot);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_user_week ON reports(user_id, week_start_date);
  `;

  try {
    await pool.query(createIndexes);
    console.log("✓ Indexes created successfully");
  } catch (error) {
    console.error("⚠ Index creation completed with notices:", error.message);
  }
  console.log("\n✅ Database initialization complete!\n");
  pool.end();
}

init().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
