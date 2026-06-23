import sys
import time
import requests

# Reconfigure stdout/stderr to support UTF-8 emojis on Windows shells
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Switch to 'http://localhost:5000/api/v1' to run validation loops locally
BASE_URL = "https://dts224-group17.onrender.com/api/v1"

def run_system_boundary_checks():
    print("====================================================")
    print("    VIRTS SYSTEM END-TO-END AUTOMATED TEST RUNNER   ")
    print("====================================================\n")

    unique_suffix = int(time.time())
    test_username = f"TEST_STUDENT_{unique_suffix}"
    
    # ──── PHASE 1: ACCOUNT SIGNUP (Testing Default Password Mechanism) ────
    print(f"[TEST 1/3] Registering user account profile: {test_username}...")
    signup_payload = {
        "username": test_username,
        "role": "Student"
        # Notice password is deliberately omitted here to force the server's default string logic!
    }

    try:
        reg_res = requests.post(f"{BASE_URL}/auth/register", json=signup_payload)
    except requests.exceptions.ConnectionError:
        print("\n❌ CRITICAL: Target operational node endpoint unreachable.")
        print(f"Check server path configurations or ensure deployment at {BASE_URL} is functional.")
        sys.exit(1)

    if reg_res.status_code != 201:
        print(f"❌ SIGNUP FAILED: Status code received [{reg_res.status_code}]")
        print(f"Response Body: {reg_res.text}")
        sys.exit(1)
    
    print("✅ REGISTRATION VERIFIED: Default fallback string setup complete.\n")

    # ──── PHASE 2: AUTHENTICATION VIA LOGINS ────
    print("[TEST 2/3] Authenticating using password defaults...")
    login_payload = {
        "username": test_username,
        "password": "password" # Verifying against default initialization value
    }

    auth_res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if auth_res.status_code != 200:
        print(f"❌ AUTH ERROR: Received validation rejection code {auth_res.status_code}")
        print(f"Payload Response: {auth_res.text}")
        sys.exit(1)

    auth_data = auth_res.json()
    token = auth_data.get("token")
    print(f"✅ AUTH SUCCESSFUL: Bearer token generated for identity structure.")
    print(f"Token Snippet: Bearer {token[:15]}...\n")

    # ──── PHASE 3: VERIFYING PROTECTED ENGINES ────
    print("[TEST 3/3] Authenticated Pipeline Testing...")
    payment_payload = {
        "order_id": 101,
        "amount_paid": 1500,
        "payment_method": "POS",
        "moniepoint_ref": f"MNP-AUTO-TEST-{unique_suffix}"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    pay_res = requests.post(f"{BASE_URL}/payments/log", json=payment_payload, headers=headers)

    if pay_res.status_code in [200, 201]:
        print("✅ LEDGER OPERATION EXECUTED SUCCESSFULLY.")
        print(f"Response Trace: {pay_res.text}")
    elif pay_res.status_code == 400 and "Fully Paid" in pay_res.text:
        print("ℹ️ SYSTEM STATE EXPECTED: Processing target instance locked/closed status logic.")
    else:
        print(f"❌ EXECUTOR ERROR: Operational error mapping failed with code {pay_res.status_code}")
        print(f"Trace Body: {pay_res.text}")

    print("\n====================================================")
    print("       E2E BOUNDARY AUTOMATION FLOW FINISHED        ")
    print("====================================================")

if __name__ == "__main__":
    run_system_boundary_checks()