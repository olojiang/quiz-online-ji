import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const sql = neon(url);

let schemaPromise: Promise<void> | null = null;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS qoj_users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    roles TEXT[] NOT NULL DEFAULT '{}',
    disabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES qoj_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_date DATE,
    code TEXT UNIQUE NOT NULL,
    current_interaction_id INT,
    screen_channel TEXT NOT NULL DEFAULT 'interaction',
    screen_theme TEXT NOT NULL DEFAULT 'orange',
    status TEXT NOT NULL DEFAULT 'upcoming',
    allow_pre_questions BOOLEAN NOT NULL DEFAULT true,
    groups TEXT[] NOT NULL DEFAULT '{}',
    blocklist TEXT[] NOT NULL DEFAULT '{}',
    min_length INT NOT NULL DEFAULT 4,
    rate_limit INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_interactions (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES qoj_events(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_questions (
    id SERIAL PRIMARY KEY,
    interaction_id INT NOT NULL REFERENCES qoj_interactions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    archived BOOLEAN NOT NULL DEFAULT false,
    highlighted BOOLEAN NOT NULL DEFAULT false,
    pinned BOOLEAN NOT NULL DEFAULT false,
    answered BOOLEAN NOT NULL DEFAULT false,
    likes INT NOT NULL DEFAULT 0,
    flag_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_question_likes (
    question_id INT NOT NULL REFERENCES qoj_questions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    PRIMARY KEY (question_id, participant_id)
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_comments (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES qoj_questions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_responses (
    id SERIAL PRIMARY KEY,
    interaction_id INT NOT NULL REFERENCES qoj_interactions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    question_index INT NOT NULL DEFAULT 0,
    answer JSONB NOT NULL,
    correct BOOLEAN,
    score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS qoj_responses_once ON qoj_responses (interaction_id, participant_id, question_index) WHERE question_index >= 0`,
  `CREATE TABLE IF NOT EXISTS qoj_participants (
    event_id INT NOT NULL REFERENCES qoj_events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, participant_id)
  )`,
  `ALTER TABLE qoj_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming'`,
  `ALTER TABLE qoj_events ADD COLUMN IF NOT EXISTS allow_pre_questions BOOLEAN NOT NULL DEFAULT true`,
  `CREATE TABLE IF NOT EXISTS qoj_event_members (
    event_id INT NOT NULL REFERENCES qoj_events(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES qoj_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (event_id, user_id, role)
  )`,
  `ALTER TABLE qoj_events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE qoj_events ADD COLUMN IF NOT EXISTS guest_theme TEXT NOT NULL DEFAULT 'blue'`,
  `ALTER TABLE qoj_participants ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `ALTER TABLE qoj_participants ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS qoj_visits (
    event_id INT NOT NULL REFERENCES qoj_events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    minute TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (event_id, minute, participant_id)
  )`,
  `CREATE TABLE IF NOT EXISTS qoj_links (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES qoj_events(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    hash TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    created_by INT REFERENCES qoj_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    visits INT NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS qoj_links_ev ON qoj_links (event_id, type)`,
  `ALTER TABLE qoj_participants ADD COLUMN IF NOT EXISTS link_id INT`,
  `CREATE INDEX IF NOT EXISTS qoj_q_inter ON qoj_questions (interaction_id)`,
  `CREATE INDEX IF NOT EXISTS qoj_r_inter ON qoj_responses (interaction_id)`,
  // 抽奖 winners: one row per drawn slot; 作废 keeps the row (voided = true) so the record survives a redraw
  `CREATE TABLE IF NOT EXISTS qoj_lottery_winners (
    id SERIAL PRIMARY KEY,
    interaction_id INT NOT NULL REFERENCES qoj_interactions(id) ON DELETE CASCADE,
    prize_index INT NOT NULL,
    prize_name TEXT NOT NULL DEFAULT '',
    participant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    round INT NOT NULL DEFAULT 1,
    voided BOOLEAN NOT NULL DEFAULT false,
    voided_at TIMESTAMPTZ,
    drawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS qoj_lw_inter ON qoj_lottery_winners (interaction_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS qoj_lw_once ON qoj_lottery_winners (interaction_id, prize_index, participant_id) WHERE NOT voided`,
];

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const s of STATEMENTS) await sql.query(s);
    })().catch((e) => {
      schemaPromise = null;
      throw e;
    });
  }
  return schemaPromise;
}
