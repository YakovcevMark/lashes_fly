CREATE TABLE telegram_login_attempts (
  state_hash text PRIMARY KEY,
  browser_key_hash text NOT NULL,
  verifier text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX telegram_login_expiry ON telegram_login_attempts (expires_at);

CREATE TABLE master_sessions (
  token_hash text PRIMARY KEY,
  telegram_id bigint NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX master_session_expiry ON master_sessions (expires_at);
