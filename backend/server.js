const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;

// Correct CORS settings for production/development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// --- Database Logic (JSON Files) ---
const DB_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const JOBS_FILE = path.join(DB_DIR, 'jobs.json');

// Ensure DB exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify([]));

function readData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Endpoints ---

// 1. Create User (Simulate PDA Initialization)
app.post('/user', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const users = readData(USERS_FILE);

    // Check if user exists
    let user = users.find(u => u.username === username);
    if (user) {
        return res.json({ message: 'User already exists', user });
    }

    // Create new user with starting credits (Simulate Airdrop/Faucet)
    user = {
        username,
        credits: 1000,
        created_at: Date.now()
    };
    users.push(user);
    writeData(USERS_FILE, users);

    console.log(`[USER] Created: ${username}`);
    res.json({ message: 'User created successfully', user });
});

// 2. Get All Users (Public Ledger)
app.get('/users', (req, res) => {
    const users = readData(USERS_FILE);
    res.json(users);
});

// 3. Create Job (Researcher Spends Credits)
app.post('/job', (req, res) => {
    const { username, dockerURI, inputHash, VRAM, bounty } = req.body;

    if (!username || !bounty) return res.status(400).json({ error: 'Missing fields' });

    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    if (users[userIndex].credits < bounty) return res.status(400).json({ error: 'Insufficient credits' });

    // Deduct Credits
    users[userIndex].credits -= Number(bounty);
    writeData(USERS_FILE, users);

    // Create Job
    const jobs = readData(JOBS_FILE);
    const newJob = {
        id: uuidv4(),
        researcher: username,
        dockerURI,
        inputHash,
        requirements: { VRAM },
        bounty: Number(bounty),
        status: 'OPEN',
        worker: null,
        resultHash: null,
        created_at: Date.now()
    };
    jobs.push(newJob);
    writeData(JOBS_FILE, jobs);

    console.log(`[JOB] Created: ${newJob.id} by ${username} (-${bounty} credits)`);
    res.json({ message: 'Job posted successfully', job: newJob });
});

// 4. Get Jobs
app.get('/jobs', (req, res) => {
    const jobs = readData(JOBS_FILE);
    // Optional filter
    const status = req.query.status;
    if (status) {
        return res.json(jobs.filter(j => j.status === status));
    }
    res.json(jobs);
});

// 5. Claim Job (Worker)
app.post('/job/claim', (req, res) => {
    const { jobId, workerUsername } = req.body;

    const jobs = readData(JOBS_FILE);
    const jobIndex = jobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return res.status(404).json({ error: 'Job not found' });
    if (jobs[jobIndex].status !== 'OPEN') return res.status(400).json({ error: 'Job not available' });

    // Update Job
    jobs[jobIndex].status = 'ASSIGNED';
    jobs[jobIndex].worker = workerUsername;
    jobs[jobIndex].started_at = Date.now();
    writeData(JOBS_FILE, jobs);

    console.log(`[JOB] Claimed: ${jobId} by ${workerUsername}`);
    res.json({ message: 'Job claimed', job: jobs[jobIndex] });
});

// 6. Complete Job & Reward (Worker)
app.post('/job/result', (req, res) => {
    const { jobId, resultHash } = req.body;

    const jobs = readData(JOBS_FILE);
    const jobIndex = jobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return res.status(404).json({ error: 'Job not found' });
    if (jobs[jobIndex].status !== 'ASSIGNED') return res.status(400).json({ error: 'Job not in progress' });

    // Update Job
    jobs[jobIndex].status = 'COMPLETED';
    jobs[jobIndex].resultHash = resultHash;
    jobs[jobIndex].completed_at = Date.now();

    const reward = jobs[jobIndex].bounty;
    const workerUsername = jobs[jobIndex].worker;

    writeData(JOBS_FILE, jobs);

    // Reward Worker
    const users = readData(USERS_FILE);
    const workerIndex = users.findIndex(u => u.username === workerUsername);

    if (workerIndex !== -1) {
        users[workerIndex].credits += reward;
        writeData(USERS_FILE, users);
        console.log(`[REWARD] +${reward} credits to ${workerUsername}`);
    } else {
        // If worker account implies existence, we might create it or error. 
        // For simulation, we assume worker has an account.
        console.log(`[WARN] Worker ${workerUsername} account not found for reward.`);
    }

    res.json({ message: 'Job completed and rewarded', job: jobs[jobIndex] });
});

// Root
app.get('/', (req, res) => {
    res.send('VeloNode Mock Backend is Running! 🚀');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
