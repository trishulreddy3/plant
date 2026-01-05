# Log service - integrates login_logs.py functionality

def log_login_attempt(email, company_name, success, ip_address=None):
    """
    Log login attempts.
    Placeholder for login_logs.py integration.
    """
    # TODO: Integrate actual login_logs.py logic here
    # For now, just print/log
    status = 'SUCCESS' if success else 'FAILED'
    log_entry = f"[{status}] Login attempt: {email}@{company_name} from {ip_address or 'unknown'}"
    print(log_entry)  # In production, write to file/database
    return True
