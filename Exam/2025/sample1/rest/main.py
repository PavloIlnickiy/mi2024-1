import os
from datetime import date, datetime, time, timezone, timedelta
from typing import Optional, List, Any

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing in .env")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
ALLOW_ORIGINS = ["*"] if CORS_ORIGINS.strip() == "*" else [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

app = FastAPI(title="Incidents API (minimal + .env)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_conn():
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()

# ---------- helpers ----------
ALLOWED_DIR = {"N","NE","E","SE","S","SW","W","NW"}
ALLOWED_SRC = {"ARTILLERY","MORTAR","MLRS","UAV_DROP","OTHER"}

def date_range_utc(date_from: Optional[date], date_to: Optional[date]):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be <= date_to")

    start_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc) if date_from else None
    end_dt = (datetime.combine(date_to, time.min, tzinfo=timezone.utc) + timedelta(days=1)) if date_to else None
    return start_dt, end_dt

def build_where(
    date_from: Optional[date],
    date_to: Optional[date],
    sector: Optional[str],
    direction: Optional[str],
    source_type: Optional[str],
    min_intensity: Optional[int],
):
    start_dt, end_dt = date_range_utc(date_from, date_to)
    clauses = []
    params: List[Any] = []

    if start_dt is not None:
        clauses.append("event_time >= %s")
        params.append(start_dt)
    if end_dt is not None:
        clauses.append("event_time < %s")
        params.append(end_dt)

    if sector:
        clauses.append("sector_code = %s")
        params.append(sector)

    if direction:
        if direction not in ALLOWED_DIR:
            raise HTTPException(status_code=422, detail=f"direction must be one of {sorted(ALLOWED_DIR)}")
        clauses.append("direction = %s")
        params.append(direction)

    if source_type:
        if source_type not in ALLOWED_SRC:
            raise HTTPException(status_code=422, detail=f"source_type must be one of {sorted(ALLOWED_SRC)}")
        clauses.append("source_type = %s")
        params.append(source_type)

    if min_intensity is not None:
        if not (1 <= min_intensity <= 5):
            raise HTTPException(status_code=422, detail="min_intensity must be 1..5")
        clauses.append("intensity >= %s")
        params.append(min_intensity)

    where_sql = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    return where_sql, params

def rows_to_dicts(cur):
    cols = [d.name for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]

# ---------- endpoints ----------
@app.get("/api/health")
def health():
    return {"status": "ok", "time_utc": datetime.now(timezone.utc)}

@app.get("/api/incidents")
def get_incidents(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sector: Optional[str] = Query(None, min_length=1, max_length=32),
    direction: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    conn=Depends(get_conn),
):
    where_sql, params = build_where(date_from, date_to, sector, direction, source_type, min_intensity)

    with conn.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM incidents{where_sql}", params)
        total = int(cur.fetchone()[0])

    total_pages = max(1, (total + page_size - 1) // page_size) if total else 1
    offset = (page - 1) * page_size

    sql = f"""
        SELECT id, event_time, sector_code, direction, source_type, caliber_mm,
               rounds_est, duration_min, intensity, target_type, effect_level, notes
        FROM incidents
        {where_sql}
        ORDER BY event_time DESC
        LIMIT %s OFFSET %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, params + [page_size, offset])
        items = rows_to_dicts(cur)

    return {"page": page, "page_size": page_size, "total": total, "total_pages": total_pages, "items": items}

@app.get("/api/metrics/summary")
def metrics_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sector: Optional[str] = Query(None, min_length=1, max_length=32),
    direction: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    conn=Depends(get_conn),
):
    where_sql, params = build_where(date_from, date_to, sector, direction, source_type, min_intensity)

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              count(*)::int AS total_incidents,
              COALESCE(avg(intensity),0)::float AS avg_intensity,
              COALESCE(sum(rounds_est),0)::int AS total_rounds_est
            FROM incidents{where_sql}
            """,
            params,
        )
        total_incidents, avg_intensity, total_rounds_est = cur.fetchone()

        cur.execute(
            f"""
            SELECT direction, count(*) AS c
            FROM incidents{where_sql}
            GROUP BY direction
            ORDER BY c DESC
            LIMIT 1
            """,
            params,
        )
        r = cur.fetchone()
        top_direction = r[0] if r else None

        cur.execute(
            f"""
            SELECT sector_code, count(*) AS c
            FROM incidents{where_sql}
            GROUP BY sector_code
            ORDER BY c DESC
            LIMIT 1
            """,
            params,
        )
        r = cur.fetchone()
        top_sector = r[0] if r else None

    return {
        "total_incidents": total_incidents,
        "avg_intensity": float(avg_intensity),
        "total_rounds_est": total_rounds_est,
        "top_direction": top_direction,
        "top_sector": top_sector,
    }

@app.get("/api/metrics/timeseries")
def metrics_timeseries(
    bucket: str = Query(...),  # day|week
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sector: Optional[str] = Query(None, min_length=1, max_length=32),
    direction: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    conn=Depends(get_conn),
):
    if bucket not in {"day", "week"}:
        raise HTTPException(status_code=422, detail="bucket must be day|week")

    trunc_expr = "date_trunc('day', event_time)" if bucket == "day" else "date_trunc('week', event_time)"
    where_sql, params = build_where(date_from, date_to, sector, direction, source_type, min_intensity)

    sql = f"""
        SELECT {trunc_expr} AS period_start, count(*)::int AS count
        FROM incidents{where_sql}
        GROUP BY period_start
        ORDER BY period_start
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return rows_to_dicts(cur)

@app.get("/api/metrics/by_source")
def metrics_by_source(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sector: Optional[str] = Query(None, min_length=1, max_length=32),
    direction: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    conn=Depends(get_conn),
):
    where_sql, params = build_where(date_from, date_to, sector, direction, None, min_intensity)

    sql = f"""
        SELECT source_type AS key, count(*)::int AS count
        FROM incidents{where_sql}
        GROUP BY source_type
        ORDER BY count DESC
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return rows_to_dicts(cur)

@app.get("/api/metrics/by_direction")
def metrics_by_direction(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sector: Optional[str] = Query(None, min_length=1, max_length=32),
    source_type: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    conn=Depends(get_conn),
):
    where_sql, params = build_where(date_from, date_to, sector, None, source_type, min_intensity)

    sql = f"""
        SELECT direction AS key, count(*)::int AS count
        FROM incidents{where_sql}
        GROUP BY direction
        ORDER BY count DESC
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return rows_to_dicts(cur)

@app.get("/api/metrics/heatmap")
def metrics_heatmap(
    bucket: str = Query("week"),  # day|week
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    direction: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    min_intensity: Optional[int] = Query(None),
    conn=Depends(get_conn),
):
    if bucket not in {"day", "week"}:
        raise HTTPException(status_code=422, detail="bucket must be day|week")

    trunc_expr = "date_trunc('day', event_time)" if bucket == "day" else "date_trunc('week', event_time)"
    where_sql, params = build_where(date_from, date_to, None, direction, source_type, min_intensity)

    sql = f"""
        SELECT sector_code, {trunc_expr} AS period_start, count(*)::int AS count
        FROM incidents{where_sql}
        GROUP BY sector_code, period_start
        ORDER BY sector_code, period_start
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return rows_to_dicts(cur)
