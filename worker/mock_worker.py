import requests
import time
import uuid
import sys

# Configuration
BACKEND_URL = "http://localhost:4000"
WORKER_NAME = f"worker-{str(uuid.uuid4())[:8]}"

print(f"🚀 VeloNode Worker Started: {WORKER_NAME}")
print(f"📡 Connecting to Mock Backend: {BACKEND_URL}")

def get_open_jobs():
    try:
        res = requests.get(f"{BACKEND_URL}/jobs?status=OPEN")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"❌ Connection Error: {e}")
    return []

def claim_job(job_id):
    try:
        payload = {"jobId": job_id, "workerUsername": WORKER_NAME}
        res = requests.post(f"{BACKEND_URL}/job/claim", json=payload)
        if res.status_code == 200:
            print(f"✅ Claimed Job: {job_id}")
            return True
        else:
            print(f"⚠️ Claim Failed: {res.json().get('error')}")
    except Exception as e:
         print(f"❌ Error claiming: {e}")
    return False

def complete_job(job_id):
    print(f"⚙️ Executing Job {job_id}...")
    time.sleep(5)  # Simulate GPU Work
    
    result_hash = f"QmResult-{uuid.uuid4()}"
    
    try:
        payload = {"jobId": job_id, "resultHash": result_hash}
        res = requests.post(f"{BACKEND_URL}/job/result", json=payload)
        if res.status_code == 200:
             print(f"🎉 Job Completed! Hash: {result_hash}")
             # Check credits
             user_res = requests.get(f"{BACKEND_URL}/users")
             users = user_res.json()
             me = next((u for u in users if u['username'] == WORKER_NAME), None)
             if me:
                 print(f"💰 Worker Balance: {me['credits']} VELO")
    except Exception as e:
        print(f"❌ Error submitting result: {e}")

def main():
    # Ensure worker user exists
    requests.post(f"{BACKEND_URL}/user", json={"username": WORKER_NAME})
    
    while True:
        jobs = get_open_jobs()
        if jobs:
            print(f"🔎 Found {len(jobs)} Open Jobs")
            for job in jobs:
                if claim_job(job['id']):
                    complete_job(job['id'])
                    break # Do one at a time
        else:
            sys.stdout.write(".")
            sys.stdout.flush()
        
        time.sleep(3)

if __name__ == "__main__":
    main()
