#!/usr/bin/env python3
"""
login_check.py

Simple script that acts like a login backend using BigQuery tables:

  sun-solar-478905.logins.entries
  sun-solar-478905.logins.entry_logs

Logic:
- company (org) and user_id comparisons are CASE-INSENSITIVE
- Check if company (org) exists
- Check if user exists for that org + category
- Check if failed attempts (entries) >= 3  -> block
- Check password:
    - if wrong: increment entries (failed attempts)
    - if correct: reset entries to 0 and log 'logged_in' in entry_logs

entry_logs will contain only:
  status = 'logged_in' or 'logged_out'

Pre-req:
  pip install google-cloud-bigquery
  set GOOGLE_APPLICATION_CREDENTIALS to service account JSON.
"""

from google.cloud import bigquery
from google.cloud.bigquery import ScalarQueryParameter, QueryJobConfig

# -----------------------------
# CONFIG: EDIT THESE VALUES
# -----------------------------
PROJECT_ID = "sun-solar-478905"
DATASET = "logins"
ENTRIES_TABLE = f"`{PROJECT_ID}.{DATASET}.entries`"
ENTRY_LOGS_TABLE = f"`{PROJECT_ID}.{DATASET}.entry_logs`"

# ====== LOGIN INPUTS (like web form) ======
COMPANY = "sunsolar"               # org (case-insensitive)
USER_ID = "user"            # user_id (case-insensitive)
PASSWORD = "test12k3"        # password to check (case-sensitive)
CATEGORY = "Technician"            # Admin / Management / Technician (you can treat as exact or also case-insensitive)


# -----------------------------
# Helper to log login/logout
# -----------------------------
def log_login_status(
    client: bigquery.Client,
    org: str,
    user: str,
    cat: str,
    status: str,
):
    """
    Insert a row into entry_logs with current timestamp and status.
    status should be ONLY:
      - 'logged_in'
      - 'logged_out'
    """
    if status not in ("logged_in", "logged_out"):
        # silently ignore invalid statuses to enforce only these two
        return

    query = f"""
        INSERT INTO {ENTRY_LOGS_TABLE} (timestamp, org, user, cat, status)
        VALUES (CURRENT_TIMESTAMP(), @org, @user, @cat, @status)
    """
    params = [
        ScalarQueryParameter("org", "STRING", org),
        ScalarQueryParameter("user", "STRING", user),
        ScalarQueryParameter("cat", "STRING", cat),
        ScalarQueryParameter("status", "STRING", status),
    ]
    job_config = QueryJobConfig(query_parameters=params)
    client.query(query, job_config=job_config).result()


# -----------------------------
# Main login logic
# -----------------------------
def login():
    client = bigquery.Client(project=PROJECT_ID)

    org_input = COMPANY
    user_input = USER_ID
    pwd_input = PASSWORD
    cat_input = CATEGORY

    # 1) Check if company (org) exists (case-insensitive)
    org_check_query = f"""
        SELECT 1
        FROM {ENTRIES_TABLE}
        WHERE LOWER(org) = LOWER(@org)
        LIMIT 1
    """
    org_params = [ScalarQueryParameter("org", "STRING", org_input)]
    org_job = client.query(org_check_query, job_config=QueryJobConfig(query_parameters=org_params))
    org_exists = any(org_job.result())

    if not org_exists:
        print("Login failed: company not found.")
        # no log row for failed attempts as per requirement
        return

    # 2) Check if user exists for that org + category (case-insensitive for org/user; cat exact or also lower)
    user_query = f"""
        SELECT created_at, org, user_id, pass, cat, entries
        FROM {ENTRIES_TABLE}
        WHERE LOWER(org) = LOWER(@org)
          AND LOWER(user_id) = LOWER(@user)
          AND LOWER(cat) = LOWER(@cat)
        LIMIT 1
    """
    user_params = [
        ScalarQueryParameter("org", "STRING", org_input),
        ScalarQueryParameter("user", "STRING", user_input),
        ScalarQueryParameter("cat", "STRING", cat_input),
    ]
    user_job = client.query(user_query, job_config=QueryJobConfig(query_parameters=user_params))
    rows = list(user_job.result())

    if not rows:
        print("Login failed: user not found for this company/category.")
        # no log row
        return

    row = rows[0]
    # canonical stored values (as in DB)
    org_db = row["org"]
    user_db = row["user_id"]
    cat_db = row["cat"]

    stored_pass = row["pass"]
    failed_entries = row["entries"] if row["entries"] is not None else 0

    # 3) Check attempts limit (3 failed tries)
    if failed_entries >= 3:
        print("Login blocked: too many failed attempts (limit 3).")
        # no log row
        return

    # 4) Check password
    if pwd_input != stored_pass:
        # wrong password -> increment failed attempts
        new_entries = failed_entries + 1
        update_query = f"""
            UPDATE {ENTRIES_TABLE}
            SET entries = @entries
            WHERE LOWER(org) = LOWER(@org)
              AND LOWER(user_id) = LOWER(@user)
              AND LOWER(cat) = LOWER(@cat)
        """
        update_params = [
            ScalarQueryParameter("entries", "INT64", new_entries),
            ScalarQueryParameter("org", "STRING", org_input),
            ScalarQueryParameter("user", "STRING", user_input),
            ScalarQueryParameter("cat", "STRING", cat_input),
        ]
        client.query(update_query, job_config=QueryJobConfig(query_parameters=update_params)).result()

        print(f"Login failed: wrong password. Attempts used: {new_entries}/3")
        # no log row
        return

    # 5) Successful login: reset failed attempts to 0
    reset_query = f"""
        UPDATE {ENTRIES_TABLE}
        SET entries = 0
        WHERE LOWER(org) = LOWER(@org)
          AND LOWER(user_id) = LOWER(@user)
          AND LOWER(cat) = LOWER(@cat)
    """
    reset_params = [
        ScalarQueryParameter("org", "STRING", org_input),
        ScalarQueryParameter("user", "STRING", user_input),
        ScalarQueryParameter("cat", "STRING", cat_input),
    ]
    client.query(reset_query, job_config=QueryJobConfig(query_parameters=reset_params)).result()

    print(f"Login successful for user '{user_db}' in org '{org_db}' as '{cat_db}'.")
    # Log only successful login
    log_login_status(client, org_db, user_db, cat_db, "logged_in")


# -----------------------------
# Optional: logout helper
# -----------------------------
def logout(org: str, user: str, cat: str):
    """
    Simple helper if you want to mark a logout event.

    Example usage:
      logout("MSL", "admin1", "Admin")
    """
    client = bigquery.Client(project=PROJECT_ID)
    log_login_status(client, org, user, cat, "logged_out")
    print(f"Logged out user '{user}' from org '{org}' as '{cat}'.")


if __name__ == "__main__":
    login()
    # Example of manual logout call:
    # logout("MSL", "admin1", "Admin")
