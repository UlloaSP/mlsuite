CREATE INDEX idx_audit_event_catalog ON audit_event (organization_id, created_at DESC, id DESC);
