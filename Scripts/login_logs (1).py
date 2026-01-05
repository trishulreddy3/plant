import psycopg2
from psycopg2 import sql
import hashlib
from datetime import datetime

# =============================================================================
# DATABASE CONFIG
# =============================================================================

DB_CONFIG = {
    "dbname": "sun_solar",
    "user": "postgres",
    "password": "12345",
    "host": "localhost",
    "port": "5432",
}

# Your existing schema/table names
SCHEMA_NAME = "logins"
CREDENTIALS_TABLE = "logins_credentials"
LOGIN_LOGS_TABLE = "login_logs"

# Business rules
MAX_FAILED_ATTEMPTS = 3


# =============================================================================
# HELPERS
# =============================================================================

def get_db_connection():
    """Create and return a new PostgreSQL connection."""
    return psycopg2.connect(**DB_CONFIG)


def hash_password(password: str) -> str:
    """
    Hash password using SHA-256.
    IMPORTANT: password_hash in the DB must be created with this same function.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# =============================================================================
# CORE AUTH LOGIC
# =============================================================================

def login_user(username: str, password: str):
    """
    Secure login function that:
      - Logs ALL attempts into logins.login_logs
      - Uses 'reputation' as failed attempts counter
      - Blocks users after 3 failed attempts
      - Records login_time and leaves the log 'open' until logout

    Returns:
      (success: bool, message: str, log_id: int | None)
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Start explicit transaction
        cur.execute("BEGIN;")

        # Lock user row to avoid race conditions on reputation
        query = sql.SQL("""
            SELECT user_id, password_hash, reputation, status
            FROM {schema}.{creds}
            WHERE username = %s
            FOR UPDATE
        """).format(
            schema=sql.Identifier(SCHEMA_NAME),
            creds=sql.Identifier(CREDENTIALS_TABLE),
        )

        cur.execute(query, (username,))
        row = cur.fetchone()

        # ------------------------------------------------------------------
        # 1. Username not found → log failed attempt with NULL user_id
        # ------------------------------------------------------------------
        if not row:
            log_q = sql.SQL("""
                INSERT INTO {schema}.{logs}
                    (user_id, login_time, logout_time, duration, status, attempts, {col})
                VALUES (NULL, %s, NULL, NULL, %s, %s, NULL)
                RETURNING log_id
            """).format(
                schema=sql.Identifier(SCHEMA_NAME),
                logs=sql.Identifier(LOGIN_LOGS_TABLE),
                col=sql.Identifier("Number_of_logins_per_day"),
            )

            cur.execute(
                log_q,
                (datetime.now(), "failed", 0),
            )
            log_id = cur.fetchone()[0]
            conn.commit()
            return False, "User not found", log_id

        user_id, stored_hash, reputation, status = row
        reputation = reputation or 0  # handle NULL

        # ------------------------------------------------------------------
        # 2. Account already blocked
        # ------------------------------------------------------------------
        if status == "BLOCKED":
            log_q = sql.SQL("""
                INSERT INTO {schema}.{logs}
                    (user_id, login_time, logout_time, duration, status, attempts, {col})
                VALUES (%s, %s, NULL, NULL, %s, %s, NULL)
                RETURNING log_id
            """).format(
                schema=sql.Identifier(SCHEMA_NAME),
                logs=sql.Identifier(LOGIN_LOGS_TABLE),
                col=sql.Identifier("Number_of_logins_per_day"),
            )
            cur.execute(
                log_q,
                (user_id, datetime.now(), "blocked", reputation),
            )
            log_id = cur.fetchone()[0]
            conn.commit()
            return False, "Account is blocked", log_id

        # ------------------------------------------------------------------
        # 3. Validate password (supports both plain-text and hashed for now)
        # ------------------------------------------------------------------
        hashed_input = hash_password(password)
        password_ok = (password == stored_hash) or (hashed_input == stored_hash)

        if not password_ok:
            # Wrong password
            new_rep = reputation + 1
            new_status = "BLOCKED" if new_rep >= MAX_FAILED_ATTEMPTS else status

            # Update credentials: reputation + optional BLOCKED status
            upd_q = sql.SQL("""
                UPDATE {schema}.{creds}
                SET reputation = %s, status = %s
                WHERE user_id = %s
            """).format(
                schema=sql.Identifier(SCHEMA_NAME),
                creds=sql.Identifier(CREDENTIALS_TABLE),
            )
            cur.execute(upd_q, (new_rep, new_status, user_id))

            # Log failed attempt (Number_of_logins_per_day is NULL for failed attempts)
            log_q = sql.SQL("""
                INSERT INTO {schema}.{logs}
                    (user_id, login_time, logout_time, duration, status, attempts, {col})
                VALUES (%s, %s, NULL, NULL, %s, %s, NULL)
                RETURNING log_id
            """).format(
                schema=sql.Identifier(SCHEMA_NAME),
                logs=sql.Identifier(LOGIN_LOGS_TABLE),
                col=sql.Identifier("Number_of_logins_per_day"),
            )
            cur.execute(
                log_q,
                (user_id, datetime.now(), "failed", new_rep),
            )
            log_id = cur.fetchone()[0]

            conn.commit()

            msg = f"Invalid credentials. Attempts: {new_rep}/3"
            if new_status == "BLOCKED":
                msg += " (account blocked)"
            return False, msg, log_id

        # ------------------------------------------------------------------
        # 4. Password OK → reset reputation and create open session log
        # ------------------------------------------------------------------
        reset_q = sql.SQL("""
            UPDATE {schema}.{creds}
            SET reputation = 0, status = 'ACTIVE'
            WHERE user_id = %s
        """).format(
            schema=sql.Identifier(SCHEMA_NAME),
            creds=sql.Identifier(CREDENTIALS_TABLE),
        )
        cur.execute(reset_q, (user_id,))

        # Calculate Number_of_logins_per_day: count successful logins (open/close) for this user today
        attempt2_query = sql.SQL("""
            SELECT COALESCE(MAX({col}), 0) + 1
            FROM {schema}.{logs}
            WHERE user_id = %s
              AND DATE(login_time) = CURRENT_DATE
              AND status IN ('open', 'close')
        """).format(
            schema=sql.Identifier(SCHEMA_NAME),
            logs=sql.Identifier(LOGIN_LOGS_TABLE),
            col=sql.Identifier("Number_of_logins_per_day"),
        )
        cur.execute(attempt2_query, (user_id,))
        attempt2 = cur.fetchone()[0]

        log_q = sql.SQL("""
            INSERT INTO {schema}.{logs}
                (user_id, login_time, logout_time, duration, status, attempts, {col})
            VALUES (%s, %s, NULL, NULL, %s, %s, %s)
            RETURNING log_id
        """).format(
            schema=sql.Identifier(SCHEMA_NAME),
            logs=sql.Identifier(LOGIN_LOGS_TABLE),
            col=sql.Identifier("Number_of_logins_per_day"),
        )
        cur.execute(
            log_q,
            (user_id, datetime.now(), "open", 0, attempt2),
        )
        log_id = cur.fetchone()[0]

        conn.commit()
        return True, "Login successful", log_id

    except Exception as e:
        conn.rollback()
        return False, f"Error: {e}", None
    finally:
        cur.close()
        conn.close()


def logout_user(log_id: int):
    """
    Logout function:
      - Sets logout_time = NOW
      - Calculates duration = logout_time - login_time
      - Changes status from 'open' to 'close'
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        now = datetime.now()

        q = sql.SQL("""
            UPDATE {schema}.{logs}
            SET
                logout_time = %s,
                duration = %s - login_time,
                status = 'close'
            WHERE log_id = %s
              AND status = 'open'
        """).format(
            schema=sql.Identifier(SCHEMA_NAME),
            logs=sql.Identifier(LOGIN_LOGS_TABLE),
        )

        cur.execute(q, (now, now, log_id))

        if cur.rowcount == 0:
            conn.rollback()
            return False, "No open session found for this log_id"

        conn.commit()
        return True, "Logout successful"

    except Exception as e:
        conn.rollback()
        return False, f"Error: {e}"
    finally:
        cur.close()
        conn.close()


def admin_unblock_user(username: str):
    """
    Admin operation:
      - Set a BLOCKED user's status back to 'ACTIVE'
      - Reset reputation (failed attempts) to 0
    After this, the user can try to log in again and
    the normal blocking logic will apply.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("BEGIN;")

        # Update only rows that are currently BLOCKED
        q = sql.SQL(
            """
            UPDATE {schema}.{creds}
            SET status = 'ACTIVE', reputation = 0
            WHERE username = %s
              AND status = 'BLOCKED'
            RETURNING user_id
        """
        ).format(
            schema=sql.Identifier(SCHEMA_NAME),
            creds=sql.Identifier(CREDENTIALS_TABLE),
        )

        cur.execute(q, (username,))
        row = cur.fetchone()

        if not row:
            conn.rollback()
            return False, "No BLOCKED user found with this username"

        conn.commit()
        return True, "User unblocked successfully"

    except Exception as e:
        conn.rollback()
        return False, f"Error: {e}"
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    # Example manual test.
    # Ensure logins.logins_credentials has:
    #   username = 'kavya'
    #   password_hash = hash_password('kavya123')  OR plain 'kavya123' (temporary)
    #   reputation = 0
    #   status = 'ACTIVE'

    username = "suresh"
    password = "hash_suresh_321"

    success, message, log_id = login_user(username, password)
    print("LOGIN:", success, message, log_id)

    if success and log_id:
        input("Press Enter to logout...")
        logout_success, logout_message = logout_user(log_id)
        print("LOGOUT:", logout_success, logout_message)