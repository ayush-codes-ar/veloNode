const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// --- Security Middleware ---
app.use(helmet()); // Secure HTTP headers

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/user/login', limiter);
app.use('/user/register', limiter);

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
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// --- Request Logging ---
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// --- Database Logic (PostgreSQL) ---

async function initDb() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT,
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

        // --- Schema Migrations ---
        // Ensure password_hash column exists (for older databases)
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='password_hash';
        `;
        const columnRes = await pool.query(checkColumnQuery);
        if (columnRes.rows.length === 0) {
            console.log("[DB] Migrating: Adding 'password_hash' to 'users' table...");
            await pool.query("ALTER TABLE users ADD COLUMN password_hash TEXT;");
        }

        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
}

initDb();

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// --- Endpoints ---

// 1. Register (New User)
app.post('/user/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userRes.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = {
            username,
            password_hash: passwordHash,
            credits: 1000,
            created_at: Date.now()
        };

        await pool.query(
            'INSERT INTO users (username, password_hash, credits, created_at) VALUES ($1, $2, $3, $4)',
            [newUser.username, newUser.password_hash, newUser.credits, newUser.created_at]
        );

        console.log(`[AUTH] User Registered: ${username}`);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Login
app.post('/user/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Invalid username or password' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                username: user.username,
                credits: user.credits
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Current User Profile (Protected)
app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT username, credits, created_at FROM users WHERE username = $1', [req.user.username]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get All Users (Public Ledger)
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT username, credits, created_at FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Create Job (Researcher Spends Credits) - Protected
app.post('/job', authenticateToken, async (req, res) => {
    const { dockerURI, inputHash, VRAM, bounty } = req.body;
    const username = req.user.username;

    if (!bounty) return res.status(400).json({ error: 'Bounty required' });
    if (Number(bounty) <= 0) return res.status(400).json({ error: 'Invalid bounty amount' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT credits FROM users WHERE username = $1', [username]);
        if (userRes.rows[0].credits < bounty) throw new Error('Insufficient credits');

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
            created_at: Date.now()
        };

        await client.query(
            'INSERT INTO jobs (id, researcher, docker_uri, input_hash, vram, bounty, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [newJob.id, newJob.researcher, newJob.dockerURI, newJob.inputHash, newJob.vram, newJob.bounty, newJob.status, newJob.created_at]
        );

        await client.query('COMMIT');
        console.log(`[JOB] Created: ${newJob.id} by ${username}`);
        res.json({ message: 'Job posted successfully', job: newJob });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 6. Get Jobs (Public)
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

// 7. Claim Job (Worker) - Protected
app.post('/job/claim', authenticateToken, async (req, res) => {
    const { jobId } = req.body;
    const workerUsername = req.user.username;

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

// 8. Complete Job & Reward (Worker) - Protected
app.post('/job/result', authenticateToken, async (req, res) => {
    const { jobId, resultHash } = req.body;
    const workerUsername = req.user.username;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
        if (jobRes.rows.length === 0) throw new Error('Job not found');
        if (jobRes.rows[0].status !== 'ASSIGNED') throw new Error('Job not in progress');
        if (jobRes.rows[0].worker !== workerUsername) throw new Error('Unauthorized worker');

        const job = jobRes.rows[0];
        const completedAt = Date.now();

        // Update Job
        const updateJobRes = await client.query(
            'UPDATE jobs SET status = $1, result_hash = $2, completed_at = $3 WHERE id = $4 RETURNING *',
            ['COMPLETED', resultHash, completedAt, jobId]
        );

        const reward = job.bounty;

        // Reward Worker
        await client.query('UPDATE users SET credits = credits + $1 WHERE username = $2', [reward, workerUsername]);
        console.log(`[REWARD] +${reward} credits to ${workerUsername}`);

        await client.query('COMMIT');
        res.json({ message: 'Job completed and rewarded', job: updateJobRes.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- Global Error Handlers ---

// 404 Handler (JSON)
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        suggestion: 'Check if your BACKEND_URL includes the correct protocol and port.'
    });
});

// 500 Handler (JSON)
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.stack}`);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

