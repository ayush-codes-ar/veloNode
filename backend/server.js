const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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
            verification_hash TEXT, -- Optional: Golden hash from researcher
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

        const createApiKeysTable = `
            CREATE TABLE IF NOT EXISTS api_keys (
                key TEXT PRIMARY KEY,
                username TEXT REFERENCES users(username),
                label TEXT,
                created_at BIGINT
            );
        `;
        await pool.query(createApiKeysTable);

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

const authenticateWorker = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // 1. Try JWT first (for dashboard testing)
    if (authHeader) {
        return authenticateToken(req, res, next);
    }

    // 2. Try API Key
    if (!apiKey) return res.status(401).json({ error: 'Authentication required (Token or API Key).' });

    try {
        const keyRes = await pool.query('SELECT username FROM api_keys WHERE key = $1', [apiKey]);
        if (keyRes.rows.length === 0) return res.status(403).json({ error: 'Invalid API Key' });

        req.user = { username: keyRes.rows[0].username };
        next();
    } catch (err) {
        res.status(500).json({ error: 'Auth system error' });
    }
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
    const { dockerURI, inputHash, VRAM, bounty, verificationHash } = req.body;
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
            verification_hash: verificationHash || null,
            created_at: Date.now()
        };

        await client.query(
            'INSERT INTO jobs (id, researcher, docker_uri, input_hash, vram, bounty, status, verification_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [newJob.id, newJob.researcher, newJob.dockerURI, newJob.inputHash, newJob.vram, newJob.bounty, newJob.status, newJob.verification_hash, newJob.created_at]
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
app.post('/job/claim', authenticateWorker, async (req, res) => {
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

// 8. Complete Job & Submit Hash (Worker) - Protected
app.post('/job/result', authenticateWorker, async (req, res) => {
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
        let finalStatus = 'VERIFYING';
        let rewarded = false;

        // --- HASH VERIFICATION LOGIC ---
        // If the researcher provided a "Golden Hash", we check it now.
        if (job.verification_hash) {
            if (job.verification_hash === resultHash) {
                finalStatus = 'COMPLETED';
                rewarded = true;
            } else {
                finalStatus = 'FAILED_VERIFICATION';
                rewarded = false;
            }
        }

        // Update Job
        await client.query(
            'UPDATE jobs SET status = $1, result_hash = $2, completed_at = $3 WHERE id = $4',
            [finalStatus, resultHash, completedAt, jobId]
        );

        // Reward Worker only if auto-verified
        if (rewarded) {
            await client.query('UPDATE users SET credits = credits + $1 WHERE username = $2', [job.bounty, workerUsername]);
            console.log(`[AUTO-REWARD] +${job.bounty} credits to ${workerUsername}`);
        }

        await client.query('COMMIT');
        res.json({
            message: rewarded ? 'Job completed and auto-verified' : 'Result submitted. Pending researcher approval.',
            status: finalStatus
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 9. Approve Job (Researcher Only) - Protected
app.post('/job/approve', authenticateToken, async (req, res) => {
    const { jobId } = req.body;
    const researcherName = req.user.username;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
        if (jobRes.rows.length === 0) throw new Error('Job not found');

        const job = jobRes.rows[0];
        if (job.researcher !== researcherName) throw new Error('Only the researcher can approve this job');
        if (job.status !== 'VERIFYING') throw new Error('Job is not in verification state');

        // Update Job Status
        await client.query('UPDATE jobs SET status = $1 WHERE id = $2', ['COMPLETED', jobId]);

        // Transfer Bounty to Worker
        await client.query('UPDATE users SET credits = credits + $1 WHERE username = $2', [job.bounty, job.worker]);

        await client.query('COMMIT');
        console.log(`[MANUAL-APPROVE] Job ${jobId} approved by ${researcherName}`);
        res.json({ message: 'Job approved. Worker rewarded.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 10. Generate API Key (Worker Auth)
app.post('/user/api-key', authenticateToken, async (req, res) => {
    const { label } = req.body;
    const apiKey = `velo_${uuidv4().split('-')[0]}${Date.now().toString(36)}`;
    try {
        await pool.query('INSERT INTO api_keys (key, username, label, created_at) VALUES ($1, $2, $3, $4)',
            [apiKey, req.user.username, label || 'Worker', Date.now()]);
        res.json({ key: apiKey, label: label || 'Worker' });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// 11. List API Keys
app.get('/user/api-keys', authenticateToken, async (req, res) => {
    try {
        const keys = await pool.query('SELECT key, label, created_at FROM api_keys WHERE username = $1', [req.user.username]);
        res.json(keys.rows);
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// 12. Delete API Key
app.delete('/user/api-key/:key', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM api_keys WHERE key = $1 AND username = $2', [req.params.key, req.user.username]);
        res.json({ message: 'Revoked' });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
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

// --- Auto-Builder Infrastructure ---
const upload = multer({ dest: 'temp/uploads/' });

app.post('/job/build', authenticateToken, upload.fields([
    { name: 'code', maxCount: 1 },
    { name: 'data', maxCount: 1 }
]), async (req, res) => {
    const { entryFile, runCommand, baseImage } = req.body;
    const jobId = uuidv4();
    const buildDir = path.join(__dirname, 'temp', 'builds', jobId);

    try {
        if (!req.files['code']) throw new Error('Code zip is required');

        // 1. Prepare Workspace
        if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

        // 2. Extract Code
        const codeZip = new AdmZip(req.files['code'][0].path);
        codeZip.extractAllTo(buildDir, true);

        // 3. Extract Data (if provided)
        if (req.files['data']) {
            const dataZip = new AdmZip(req.files['data'][0].path);
            const dataDir = path.join(buildDir, 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
            dataZip.extractAllTo(dataDir, true);
        }

        // 4. Generate Dockerfile
        // We detect if requirements.txt exists to auto-install deps
        const hasReqs = fs.existsSync(path.join(buildDir, 'requirements.txt'));
        const dockerfileContent = `
FROM ${baseImage || 'python:3.9-slim'}
WORKDIR /app
COPY . .
${hasReqs ? 'RUN pip install --no-cache-dir -r requirements.txt' : ''}
ENV VELO_JOB_ID=${jobId}
CMD ${runCommand || `python ${entryFile}`}
        `.trim();

        fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfileContent);

        // 5. Execute Build
        const hubUser = process.env.DOCKER_HUB_USER;
        const hubPass = process.env.DOCKER_HUB_PASS;
        const registryImage = hubUser ? `${hubUser}/velonode-job-${jobId.slice(0, 8)}` : `velonode/job-${jobId.slice(0, 8)}`;

        console.log(`[BUILD] Starting Docker build: ${registryImage}`);

        let buildCmd = `docker build -t ${registryImage} ${buildDir}`;

        // If credentials exist, chain the build with a push
        if (hubUser && hubPass) {
            console.log(`[BUILD] Registry account detected. Chaining PUSH...`);
            buildCmd = `docker login -u ${hubUser} -p ${hubPass} && docker build -t ${registryImage} ${buildDir} && docker push ${registryImage}`;
        }

        exec(buildCmd, (error, stdout, stderr) => {
            // Clean up temp files
            fs.rmSync(req.files['code'][0].path, { force: true });
            if (req.files['data']) fs.rmSync(req.files['data'][0].path, { force: true });

            if (error) {
                console.error(`[BUILD ERROR] ${error.message}`);
                return res.status(500).json({ error: 'Build & Push failed', logs: stderr });
            }

            console.log(`[BUILD SUCCESS] ${registryImage} is live.`);
            res.json({
                message: hubUser ? 'Build & Push successful' : 'Build successful (Local only)',
                imageName: registryImage,
                jobId: jobId
            });
        });

    } catch (err) {
        console.error(`[BUILD SYSTEM ERROR] ${err.message}`);
        res.status(400).json({ error: err.message });
    }
});

// --- Initialization ---
const initWorkspace = () => {
    const dirs = ['temp/uploads', 'temp/builds'];
    dirs.forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    // Check if Docker is available
    exec('docker --version', (err, stdout) => {
        if (err) {
            console.warn('[WARNING] Docker not found on host. Auto-Builder will fail.');
        } else {
            console.log(`[SYSTEM] Docker detected: ${stdout.trim()}`);
        }
    });
};

app.listen(PORT, () => {
    initWorkspace();
    console.log(`Server running on port ${PORT}`);
});

