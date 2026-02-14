import time
import requests
import subprocess
import sys
import os
import signal

# Define the endpoint
URL = "http://127.0.0.1:8000/generate/package"

# Sample Payload
payload = {
    "resume": {
        "name": "Alex Rivera",
        "email": "alex.rivera@example.com",
        "phone": "+1 (555) 012-3456",
        "location": "San Francisco, CA",
        "role": "Senior Product Designer",
        "experience": [
            {
                "id": "1",
                "company": "TechCorp Solutions",
                "role": "Senior Software Engineer",
                "startDate": "Jan 2020",
                "endDate": "Present",
                "current": True,
                "description": "Led the migration of legacy monolithic architecture to microservices.",
                "tags": ["AWS", "Microservices"]
            }
        ]
    },
    "job_description": "We need a Senior Software Engineer with AWS experience.",
    "company_name": "Tech Giant",
    "variant": "standard",
    "include_cover_letter": True,
    "use_ai_judge": True
}

def start_server():
    """Starts the server in a subprocess."""
    print("Starting server...")
    process = subprocess.Popen(
        [sys.executable, "server.py"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid
    )
    time.sleep(3) # Wait for server to start
    return process

def stop_server(process):
    """Stops the server."""
    print("Stopping server...")
    os.killpg(os.getpgid(process.pid), signal.SIGTERM)

def benchmark():
    try:
        start_time = time.time()
        response = requests.post(URL, json=payload)
        end_time = time.time()

        if response.status_code == 200:
            print(f"Success! Response time: {end_time - start_time:.4f} seconds")
            # print(response.json())
        else:
            print(f"Failed! Status Code: {response.status_code}")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("Could not connect to server.")

if __name__ == "__main__":
    server_process = start_server()
    try:
        benchmark()
    finally:
        stop_server(server_process)
