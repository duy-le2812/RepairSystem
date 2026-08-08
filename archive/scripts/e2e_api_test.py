import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:8000"

def run_test():
    print("=== START E2E API VERIFICATION ===")
    
    # 1. Login
    login_url = f"{BASE_URL}/api/login/"
    login_payload = {
        "username": "admin",
        "password": "Admin@123"
    }
    
    print(f"1. Sending POST to {login_url}")
    login_response = requests.post(login_url, json=login_payload)
    print(f"   HTTP Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print("   Login Failed!")
        print(f"   Response: {login_response.text}")
        return
        
    login_data = login_response.json()
    token = login_data.get("access_token")
    print(f"   Login Success. Token acquired.")
    
    # Decode token payload to see if role exists
    try:
        # We can just split JWT to get payload part
        payload_b64 = token.split('.')[1]
        import base64
        # Add padding if needed
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_data = json.loads(base64.b64decode(payload_b64).decode('utf-8'))
        print(f"   Token Payload: {json.dumps(payload_data)}")
    except Exception as e:
        print(f"   Could not decode token: {e}")
    
    # 2. Get Tickets
    tickets_url = f"{BASE_URL}/api/admin/tickets"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"2. Sending GET to {tickets_url}")
    tickets_response = requests.get(tickets_url, headers=headers)
    
    print(f"   HTTP Status: {tickets_response.status_code}")
    
    # Print the exact Response JSON
    try:
        tickets_json = tickets_response.json()
        print("\n=== RESPONSE JSON (FULL) ===")
        print(json.dumps(tickets_json, indent=2, ensure_ascii=False))
        print("============================\n")
        if isinstance(tickets_json, list):
            print(f"Total elements received: {len(tickets_json)}")
        else:
            print(f"Response is not a list. Detail: {tickets_json.get('detail')}")
    except Exception as e:
        print(f"   Failed to parse JSON response: {e}")
        print(f"   Raw text: {tickets_response.text}")

if __name__ == "__main__":
    run_test()
