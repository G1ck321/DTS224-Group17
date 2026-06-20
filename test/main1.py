#python script to test endpoints
import requests

req = requests.post("http://127.0.0.1:5000/api/v1/auth")
print(req.text, req.status_code)