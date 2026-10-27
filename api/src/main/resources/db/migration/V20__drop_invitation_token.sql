-- Invitees answer their invitations from Notifications, signed in with the invited address; no
-- flow reads an invitation link any more, so its secret token has no purpose left.
ALTER TABLE invitation DROP CONSTRAINT uq_invitation_token;
ALTER TABLE invitation DROP COLUMN token;
