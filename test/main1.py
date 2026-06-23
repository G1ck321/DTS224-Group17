import sys
import requests

# Reconfigure stdout/stderr to support UTF-8 emojis on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "https://dts224-group17.onrender.com/api/v1"

def run_integration_test():
    print("====================================================")
    print("   VIRTS BACKEND SYSTEM BOUNDARY TEST RUNNER         ")
    print("====================================================\n")

    # ──── STEP 1: AUTHENTICATION TESTING ────
    print("[TEST 1/2] Attempting Auth Gateway Connection...")
    login_payload = {
        "username": "SELLER_JOHN",
        "password": "password"
    }
    
    try:
        auth_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    except requests.exceptions.ConnectionError:
        print("\n❌ CRITICAL: Could not reach the Node.js backend.")
        print("Ensure your server is live via 'npm run dev' and listening on Port 5000.")
        sys.exit(1)

    if auth_response.status_code != 200:
        print(f"❌ AUTH FAILED: Server returned HTTP status {auth_response.status_code}")
        print(f"Payload Response: {auth_response.text}")
        sys.exit(1)

    auth_data = auth_response.json()
    token = auth_data.get("token")
    user_role = auth_data.get("user", {}).get("role")
    
    print(f"✅ AUTH SUCCESSFUL: Logged in as profile role [{user_role}]")
    print(f"Token Retrieved: Bearer {token[:15]}...\n")

    # ──── STEP 2: PROTECTED ROUTE TESTING ────
    print("[TEST 2/2] Testing Protected Payment Ledger Insertion...")
    import time
    payment_payload = {
        "order_id": 101,
        "amount_paid": 2000,
        "payment_method": "POS",
        "moniepoint_ref": f"MNP-PYTHON-TEST-{int(time.time())}"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    pay_response = requests.post(f"{BASE_URL}/payments/log", json=payment_payload, headers=headers)

    if pay_response.status_code in [200, 201]:
        print("✅ LEDGER INGESTION MATCHED EXPECTATIONS!")
        print(f"Response: {pay_response.text}")
    elif pay_response.status_code == 400 and "Fully Paid" in pay_response.text:
        print("ℹ️ CONSTRAINT TRIGGERED: Order status is already closed or locked.")
        print(f"Response: {pay_response.text}")
    else:
        print(f"❌ OPERATION REJECTED: HTTP status {pay_response.status_code}")
        print(f"Response Frame: {pay_response.text}")

    print("\n====================================================")
    print("   INTEGRATION ROUTINE COMPLETE                     ")
    print("====================================================")

if __name__ == "__main__":
    run_integration_test()