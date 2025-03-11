-- Create realtime schema
CREATE SCHEMA IF NOT EXISTS realtime;

-- Create subscription table
CREATE TABLE IF NOT EXISTS realtime.subscription (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subscription_id uuid NOT NULL,
    entity text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    claims jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscription_subscription_id_idx 
    ON realtime.subscription (subscription_id);
CREATE INDEX IF NOT EXISTS subscription_entity_idx 
    ON realtime.subscription (entity);

-- Grant permissions
GRANT USAGE ON SCHEMA realtime TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO postgres, authenticated, service_role;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime
    GRANT ALL ON TABLES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime
    GRANT ALL ON SEQUENCES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime
    GRANT ALL ON FUNCTIONS TO postgres, authenticated, service_role; 