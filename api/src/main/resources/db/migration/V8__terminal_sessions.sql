-- The terminal sessions the API opened that have not ended yet. A session leaves this table once,
-- however it ends (closed, its browser gone, or ended by the ops agent), and that is when its end
-- is audited, so every opened session has exactly one close event.
CREATE TABLE terminal_session (
    id VARCHAR(64) PRIMARY KEY,
    opened_by_user_id BIGINT CONSTRAINT fk_terminal_session_user REFERENCES app_user ON DELETE SET NULL,
    service_name VARCHAR(120) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now());
