const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Correct CORS settings for production/development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// --- Database Logic (PostgreSQL) ---

async function initDb() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            credits INTEGER DEFAULT 1000,
            created_at BIGINT
        );
    `;
    const createJobsTable = `
        CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY,
            researcher TEXT REFERENCES users(username),
            docker_uri TEXT,
            input_hash TEXT,
            vram TEXT,
            bounty INTEGER,
            status TEXT,
            worker TEXT,
            result_hash TEXT,
            created_at BIGINT,
            started_at BIGINT,
            completed_at BIGINT
        );
    `;

    try {
        await pool.query(createUsersTable);
        await pool.query(createJobsTable);
        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
}

initDb();

// --- Endpoints ---

// 1. Create User (Simulate PDA Initialization)
app.post('/user', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
        // Check if user exists
        const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userRes.rows.length > 0) {
            return res.json({ message: 'User already exists', user: userRes.rows[0] });
        }

        // Create new user
        const newUser = {
            username,
            credits: 1000,
            created_at: Date.now()
        };
        await pool.query(
            'INSERT INTO users (username, credits, created_at) VALUES ($1, $2, $3)',
            [newUser.username, newUser.credits, newUser.created_at]
        );

        console.log(`[USER] Created: ${username}`);
        res.json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get All Users (Public Ledger)
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Create Job (Researcher Spends Credits)
app.post('/job', async (req, res) => {
    const { username, dockerURI, inputHash, VRAM, bounty } = req.body;

    if (!username || !bounty) return res.status(400).json({ error: 'Missing fields' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT credits FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) {
            throw new Error('User not found');
        }

        if (userRes.rows[0].credits < bounty) {
            throw new Error('Insufficient credits');
        }

        // Deduct Credits
        await client.query('UPDATE users SET credits = credits - $1 WHERE username = $2', [Number(bounty), username]);

        // Create Job
        const newJob = {
            id: uuidv4(),
            researcher: username,
            dockerURI,
            inputHash,
            vram: VRAM,
            bounty: Number(bounty),
            status: 'OPEN',
            worker: null,
            resultHash: null,
            created_at: Date.now()
        };

        await client.query(
            'INSERT INTO jobs (id, researcher, docker_uri, input_hash, vram, bounty, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [newJob.id, newJob.researcher, newJob.dockerURI, newJob.inputHash, newJob.vram, newJob.bounty, newJob.status, newJob.created_at]
        );

        await client.query('COMMIT');
        console.log(`[JOB] Created: ${newJob.id} by ${username} (-${bounty} credits)`);
        res.json({ message: 'Job posted successfully', job: newJob });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 4. Get Jobs
app.get('/jobs', async (req, res) => {
    const status = req.query.status;
    try {
        let result;
        if (status) {
            result = await pool.query('SELECT * FROM jobs WHERE status = $1', [status]);
        } else {
            result = await pool.query('SELECT * FROM jobs');
        }
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Claim Job (Worker)
app.post('/job/claim', async (req, res) => {
    const { jobId, workerUsername } = req.body;

    try {
        const jobRes = await pool.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
        if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        if (jobRes.rows[0].status !== 'OPEN') return res.status(400).json({ error: 'Job not available' });

        const startedAt = Date.now();
        const updateRes = await pool.query(
            'UPDATE jobs SET status = $1, worker = $2, started_at = $3 WHERE id = $4 RETURNING *',
            ['ASSIGNED', workerUsername, startedAt, jobId]
        );

        console.log(`[JOB] Claimed: ${jobId} by ${workerUsername}`);
        res.json({ message: 'Job claimed', job: updateRes.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Complete Job & Reward (Worker)
app.post('/job/result', async (req, res) => {
    const { jobId, resultHash } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
        if (jobRes.rows.length === 0) throw new Error('Job not found');
        if (jobRes.rows[0].status !== 'ASSIGNED') throw new Error('Job not in progress');

        const job = jobRes.rows[0];
        const completedAt = Date.now();

        // Update Job
        const updateJobRes = await client.query(
            'UPDATE jobs SET status = $1, result_hash = $2, completed_at = $3 WHERE id = $4 RETURNING *',
            ['COMPLETED', resultHash, completedAt, jobId]
        );

        const reward = job.bounty;
        const workerUsername = job.worker;

        // Reward Worker
        const workerRes = await client.query('SELECT * FROM users WHERE username = $1', [workerUsername]);
        if (workerRes.rows.length > 0) {
            await client.query('UPDATE users SET credits = credits + $1 WHERE username = $2', [reward, workerUsername]);
            console.log(`[REWARD] +${reward} credits to ${workerUsername}`);
        } else {
            console.log(`[WARN] Worker ${workerUsername} account not found for reward.`);
        }

        await client.query('COMMIT');
        res.json({ message: 'Job completed and rewarded', job: updateJobRes.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Root
app.get('/', (req, res) => {
    res.send('VeloNode Mock Backend is Running! 🚀');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

