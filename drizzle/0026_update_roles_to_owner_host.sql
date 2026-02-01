-- Migration: Update role system from admin/moderator/member to owner/host/member
-- 'admin' becomes 'owner'
-- 'moderator' becomes 'host' 
-- 'member' stays as 'member'

-- Update existing admin roles to owner
UPDATE group_members SET role = 'owner' WHERE role = 'admin';

-- Update existing moderator roles to host
UPDATE group_members SET role = 'host' WHERE role = 'moderator';

-- Note: 'member' role stays as is
