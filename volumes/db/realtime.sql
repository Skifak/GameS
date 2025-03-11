CREATE SCHEMA IF NOT EXISTS realtime;

-- Создаем таблицу для подписок
CREATE TABLE IF NOT EXISTS realtime.subscription (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subscription_id uuid NOT NULL,
    entity text NOT NULL,
    filters jsonb,
    claims jsonb,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Создаем индекс для быстрого поиска по subscription_id
CREATE INDEX IF NOT EXISTS subscription_subscription_id_idx ON realtime.subscription (subscription_id);

-- Даем права на схему realtime
GRANT USAGE ON SCHEMA realtime TO postgres, anon, authenticated, service_role;

-- Даем права на таблицы в схеме realtime
GRANT ALL ON ALL TABLES IN SCHEMA realtime TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO postgres, anon, authenticated, service_role; 