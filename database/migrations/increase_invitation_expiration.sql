-- Increase invitation expiration from 7 days to 30 days
-- This migration updates existing invitations and sets new default

-- Update existing pending invitations that haven't expired yet to extend their expiration
UPDATE provider_invitations 
SET expires_at = created_at + INTERVAL '30 days'
WHERE status = 'pending' 
  AND expires_at > NOW()
  AND expires_at < (created_at + INTERVAL '7 days'); -- Only update those with 7-day expiration

-- Update the default expiration for new invitations
-- Note: This requires updating the table default constraint
ALTER TABLE provider_invitations 
ALTER COLUMN expires_at 
SET DEFAULT (NOW() + INTERVAL '30 days');
