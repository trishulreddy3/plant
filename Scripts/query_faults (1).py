#!/usr/bin/env python3
"""
query_faults.py

Simple script to query faults table with:
- date range (on condition_ts)
- optional table filter (tb_no)
- optional condition label (G/M/B)
and print JSON to stdout.

If CONDITION_LABEL is "M" or "B", only panels with that label
are kept in the output (others are removed from panels.t_pv / panels.b_pv).
"""

import json
from typing import Any, Sequence

from google.cloud import bigquery

# -----------------------------
# CONFIG: EDIT THESE VALUES
# -----------------------------
PROJECT_ID = "sun-solar-478905"

# Dates are based on DATE(condition_ts)
START_DATE = "2025-12-01"
END_DATE   = "2025-12-30"

# Tables: list of tb_no integers, or None for ALL
TABLES = None      # e.g. [1,2,3] or None

# Condition label: "G", "M", "B", or None for no filter
CONDITION_LABEL = "B"   # "G" / "M" / "B" / None


# -----------------------------
# Helper: recursively convert BQ values to plain Python types
# -----------------------------
def to_native(obj: Any) -> Any:
    """
    Convert nested BigQuery values (STRUCTs, lists) to plain types.
    BigQuery structs usually arrive as dicts, rows arrive as bigquery.Row
    and we handle those separately in main().
    """
    from collections.abc import Mapping

    # Mapping -> dict
    if isinstance(obj, Mapping):
        return {k: to_native(v) for k, v in obj.items()}

    # Non-string sequences -> list
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes)):
        return [to_native(v) for v in obj]

    return obj


# -----------------------------
# Build and run query
# -----------------------------
def build_query_and_params():
    client = bigquery.Client(project=PROJECT_ID)

    query = """
        SELECT
          generated_at,
          tb_no,
          latest_temp,
          latest_light,
          ex_V,
          ex_A,
          condition_ts,
          panels
        FROM `sun-solar-478905.Fault_Table.faults`
        WHERE DATE(condition_ts) BETWEEN @start_date AND @end_date
    """

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", START_DATE),
        bigquery.ScalarQueryParameter("end_date",   "DATE", END_DATE),
    ]

    # Optional tb_no filter
    if TABLES is not None and len(TABLES) > 0:
        query += " AND tb_no IN UNNEST(@tb_nos)\n"
        params.append(
            bigquery.ArrayQueryParameter("tb_nos", "INT64", TABLES)
        )

    # Optional condition label filter (G/M/B)
    if CONDITION_LABEL in ("G", "M", "B"):
        query += """
          AND @cond_label IN (
            panels.t_pv.p1, panels.t_pv.p2, panels.t_pv.p3, panels.t_pv.p4, panels.t_pv.p5,
            panels.t_pv.p6, panels.t_pv.p7, panels.t_pv.p8, panels.t_pv.p9, panels.t_pv.p10,
            panels.b_pv.p1, panels.b_pv.p2, panels.b_pv.p3, panels.b_pv.p4, panels.b_pv.p5,
            panels.b_pv.p6, panels.b_pv.p7, panels.b_pv.p8, panels.b_pv.p9, panels.b_pv.p10
          )
        """
        params.append(
            bigquery.ScalarQueryParameter("cond_label", "STRING", CONDITION_LABEL)
        )

    query += " ORDER BY condition_ts DESC, tb_no"

    job_config = bigquery.QueryJobConfig(query_parameters=params)
    return client, query, job_config


def filter_panels_by_condition(panels: dict, label: str | None) -> dict:
    """
    Given panels = {"t_pv": {...}, "b_pv": {...}},
    return a new dict where only panels with the given label remain.

    If label is None, return panels unchanged.
    """
    if label not in ("G", "M", "B"):
        return panels

    t = panels.get("t_pv") or {}
    b = panels.get("b_pv") or {}

    t_filtered = {k: v for k, v in t.items() if v == label}
    b_filtered = {k: v for k, v in b.items() if v == label}

    return {
        "t_pv": t_filtered,
        "b_pv": b_filtered,
    }


def main():
    client, query, job_config = build_query_and_params()

    print("Running query with parameters:")
    print(f"  START_DATE      = {START_DATE}")
    print(f"  END_DATE        = {END_DATE}")
    print(f"  TABLES          = {TABLES if TABLES is not None else 'ALL'}")
    print(f"  CONDITION_LABEL = {CONDITION_LABEL if CONDITION_LABEL else 'ANY'}")
    print()

    query_job = client.query(query, job_config=job_config)
    rows = list(query_job.result())

    data = []
    for row in rows:
        record = {}
        for field_name, value in row.items():
            record[field_name] = to_native(value)

        # Post-process panels: keep only panels with CONDITION_LABEL (M or B)
        if "panels" in record:
            record["panels"] = filter_panels_by_condition(
                record["panels"], CONDITION_LABEL
            )

        data.append(record)

    print(json.dumps(data, indent=2, default=str))
    print(f"\nTotal rows: {len(data)}")


if __name__ == "__main__":
    main()
