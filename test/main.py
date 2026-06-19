import base64
import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")

credentials = f"{API_KEY}:{SECRET_KEY}"

encoded = base64.b64encode(credentials.encode()).decode()
print(encoded)

response = requests.post(
    "https://sandbox.monnify.com/api/v1/auth/login",
    headers={
        "Authorization": f"Basic {encoded}"
    }
)

#generate accesstoken to authenticate endpoints
print(response.json())