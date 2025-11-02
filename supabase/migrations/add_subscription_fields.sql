-- Add subscription tracking fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS whop_user_id text;

-- Add index for faster subscription queries
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON users(subscription_status);
CREATE INDEX IF NOT EXISTS users_whop_user_id_idx ON users(whop_user_id);

-- Add constraint to ensure valid subscription statuses
ALTER TABLE users 
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due'));

-- Comment the columns for documentation
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status: free, active, cancelled, or past_due';
COMMENT ON COLUMN users.subscription_id IS 'Whop membership/subscription ID';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the subscription expires (null for free tier)';
COMMENT ON COLUMN users.whop_user_id IS 'Whop user ID for cross-referencing';

