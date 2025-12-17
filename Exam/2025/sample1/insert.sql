-- ============================================================
-- PostgreSQL: створення та заповнення навчальної таблиці incidents
-- PK = SERIAL (без UUID). Дані синтетичні.
-- ============================================================

DROP TABLE IF EXISTS incidents;

CREATE TABLE incidents (
    id            bigserial   PRIMARY KEY,
    event_time    timestamptz NOT NULL,
    sector_code   text        NOT NULL, -- напр. GRID_042
    direction     text        NOT NULL, -- N, NE, E, SE, S, SW, W, NW
    source_type   text        NOT NULL, -- ARTILLERY, MORTAR, MLRS, UAV_DROP, OTHER
    caliber_mm    integer     NULL,
    rounds_est    integer     NOT NULL CHECK (rounds_est >= 0),
    duration_min  integer     NULL CHECK (duration_min IS NULL OR duration_min >= 0),
    intensity     smallint    NOT NULL CHECK (intensity BETWEEN 1 AND 5),
    target_type   text        NOT NULL, -- POSITION, ROAD, LOGISTICS, UNKNOWN
    effect_level  smallint    NOT NULL CHECK (effect_level BETWEEN 0 AND 3),
    notes         text        NULL
);

-- Індекси під фільтри/агрегації
CREATE INDEX idx_incidents_event_time      ON incidents (event_time);
CREATE INDEX idx_incidents_sector_code     ON incidents (sector_code);
CREATE INDEX idx_incidents_dir_src_time    ON incidents (event_time, direction, source_type);

-- ============================================================
-- Заповнення синтетикою (мін. 1200 записів)
-- ============================================================

INSERT INTO incidents (
    event_time, sector_code, direction, source_type, caliber_mm,
    rounds_est, duration_min, intensity, target_type, effect_level, notes
)
SELECT
    now() - (random() * interval '90 days') AS event_time,

    'GRID_' || lpad(((1 + floor(random() * 120))::int)::text, 3, '0') AS sector_code,

    (ARRAY['N','NE','E','SE','S','SW','W','NW'])[1 + floor(random() * 8)::int] AS direction,

    CASE
        WHEN random() < 0.52 THEN 'ARTILLERY'
        WHEN random() < 0.78 THEN 'MORTAR'
        WHEN random() < 0.90 THEN 'MLRS'
        WHEN random() < 0.96 THEN 'UAV_DROP'
        ELSE 'OTHER'
    END AS source_type,

    CASE
        WHEN random() < 0.10 THEN NULL
        ELSE
            CASE
                WHEN (random() < 0.52) THEN (ARRAY[122,152,155])[1 + floor(random() * 3)::int]
                WHEN (random() < 0.78) THEN (ARRAY[82,120])[1 + floor(random() * 2)::int]
                WHEN (random() < 0.90) THEN (ARRAY[122,220,300])[1 + floor(random() * 3)::int]
                WHEN (random() < 0.96) THEN (ARRAY[60,82])[1 + floor(random() * 2)::int]
                ELSE (ARRAY[105,122,152])[1 + floor(random() * 3)::int]
            END
    END AS caliber_mm,

    0 AS rounds_est, -- тимчасово, перерахуємо нижче

    GREATEST(0, LEAST(45, (round(random() * 30 + random() * 10))::int)) AS duration_min,

    CASE
        WHEN random() < 0.12 THEN 1
        WHEN random() < 0.38 THEN 2
        WHEN random() < 0.72 THEN 3
        WHEN random() < 0.92 THEN 4
        ELSE 5
    END AS intensity,

    CASE
        WHEN random() < 0.55 THEN 'POSITION'
        WHEN random() < 0.75 THEN 'ROAD'
        WHEN random() < 0.92 THEN 'LOGISTICS'
        ELSE 'UNKNOWN'
    END AS target_type,

    CASE
        WHEN random() < 0.52 THEN 0
        WHEN random() < 0.82 THEN 1
        WHEN random() < 0.95 THEN 2
        ELSE 3
    END AS effect_level,

    CASE
        WHEN random() < 0.90 THEN NULL
        ELSE (ARRAY[
            'Short burst; no confirmed effect',
            'Repeated fire within 15 minutes',
            'Increased activity during evening hours',
            'Low visibility; estimates uncertain'
        ])[1 + floor(random() * 4)::int]
    END AS notes
FROM generate_series(1, 1200) g;

-- rounds_est залежить від intensity + source_type (простий навчальний підхід)
UPDATE incidents i
SET rounds_est =
    GREATEST(0,
        (
            CASE i.source_type
                WHEN 'ARTILLERY' THEN 4
                WHEN 'MORTAR'    THEN 6
                WHEN 'MLRS'      THEN 2
                WHEN 'UAV_DROP'  THEN 1
                ELSE 3
            END
            * i.intensity
            + floor(random() * (i.intensity * 3 + 2))::int
        )
    );

-- Інколи duration_min = NULL
UPDATE incidents
SET duration_min = NULL
WHERE random() < 0.08;

-- Додаємо "пікове вікно" (аномалії) +80 записів у вузькому часі
INSERT INTO incidents (
    event_time, sector_code, direction, source_type, caliber_mm,
    rounds_est, duration_min, intensity, target_type, effect_level, notes
)
SELECT
    date_trunc('hour', now() - interval '10 days') + (random() * interval '6 hours') AS event_time,
    'GRID_' || lpad(((1 + floor(random() * 30))::int)::text, 3, '0') AS sector_code,
    (ARRAY['NE','E','SE'])[1 + floor(random() * 3)::int] AS direction,
    (ARRAY['ARTILLERY','MORTAR','MLRS'])[1 + floor(random() * 3)::int] AS source_type,
    (ARRAY[122,152,155,120,220])[1 + floor(random() * 5)::int] AS caliber_mm,
    (10 + floor(random() * 40))::int AS rounds_est,
    (5 + floor(random() * 25))::int AS duration_min,
    (ARRAY[4,5])[1 + floor(random() * 2)::int] AS intensity,
    (ARRAY['POSITION','LOGISTICS'])[1 + floor(random() * 2)::int] AS target_type,
    (ARRAY[1,2,3])[1 + floor(random() * 3)::int] AS effect_level,
    'Peak activity window (synthetic)' AS notes
FROM generate_series(1, 80);

-- Перевірка
-- SELECT count(*) AS total_rows FROM incidents;
-- SELECT min(event_time), max(event_time) FROM incidents;

