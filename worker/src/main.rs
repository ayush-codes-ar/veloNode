use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;
use anchor_client::{Client, Cluster, Program};
use solana_sdk::signature::{Keypair, Signer, read_keypair_file};
use solana_sdk::pubkey::Pubkey;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};

// =========================================================================
// VeloNode Worker Skeleton (Rust)
// =========================================================================
//
// DESIGN PHILOSOPHY:
// 1. Zero Trust: We assume the Job Container is malicious. It runs in gVisor (`runsc`).
//    Network is detached (`--network none`).
// 2. Serverless: We poll the Solana Chain directly. No intermediate API.
// 3. Free: Uses Solana Devnet.
//
// ARCHITECTURE:
// - `main`: Initializes Wallet, connection, and starts the loops.
// - `poller_loop`: Finds 'OPEN' jobs on-chain matching specs.
// - `execution_loop`: Runs the container, sends keypress/GPU telemetry.
// - `heartbeat_loop`: Signs and sends transactions every N minutes.
// =========================================================================

// Config Constants
const HEARTBEAT_INTERVAL_SEC: u64 = 300; // 5 Minutes
const RPC_URL: &str = "https://api.devnet.solana.com";
const PROGRAM_ID: &str = "VeloNode11111111111111111111111111111111111"; // Replace with deployed ID

#[tokio::main]
async fn main() -> Result<()> {
    // 1. Setup Wallet (Student's Laptop Identity)
    // In prod, this would be encrypted or from a Ledger.
    // For now, read from local FS.
    let payer = read_keypair_file("worker_wallet.json")
        .context("Failed to read wallet. Run `solana-keygen new` first.")?;
    
    let client = Client::new(Cluster::Devnet, &payer);
    let program = client.program(PROGRAM_ID.parse().unwrap()); // Unwrap safe for const
    
    println!("🚀 VeloNode Worker Starting...");
    println!("🆔 Worker PubKey: {}", payer.pubkey());
    println!("🌍 Connected to Solana Devnet");

    // 2. Shared State
    // In a real app, use a proper State Machine (Mutex<WorkerState>).
    let worker_state = Arc::new(tokio::sync::Mutex::new(WorkerState::Idle));

    // 3. Start Background Loops
    let state_clone_poll = worker_state.clone();
    let program_clone = program.clone(); // Client is cheap to clone usually
    
    // Fire up the Poller
    let poller_handle = tokio::spawn(async move {
        loop {
            if let Err(e) = poll_for_jobs(&program_clone, &state_clone_poll).await {
                eprintln!("❌ Poller Error: {}", e);
            }
            sleep(Duration::from_secs(10)).await;
        }
    });

    // Fire up the Heartbeat Service
    // Note: detailed heartbeat logic would wait for `Assigned` state.
    // For skeleton, we show the loop structure.
    
    println!("✅ Worker Active. Waiting for jobs...");
    
    // Keep main alive
    poller_handle.await?;
    
    Ok(())
}

// =========================================================================
// MODULE: Job Polling (Discovery)
// =========================================================================

async fn poll_for_jobs(program: &Program, state: &Arc<tokio::sync::Mutex<WorkerState>>) -> Result<()> {
    let mut current_state = state.lock().await;

    // Strict Check: Don't look for work if we are busy.
    if *current_state != WorkerState::Idle {
        return Ok(());
    }

    // RPC Call: Get Program Accounts filtered by 'JobState::Open'
    // This is "Serverless" discovery. The Chain is the DB.
    // In Rust Anchor Client, this looks like: `program.accounts::<Job>(vec![filter])`
    
    println!("🔍 Scanning Blockchain for OPEN jobs matching specs...");
    
    // Mock finding a job for skeleton purposes
    let found_job = false; 
    
    if found_job {
        println!("✨ Found secure job! Claiming...");
        // 1. Send Claim Transaction
        // program.request()
        //    .accounts(...)
        //    .args(instruction::ClaimJob {})
        //    .send()?;
        
        *current_state = WorkerState::Assigned(JobContext {
            job_id: "job_123".to_string(),
            image_uri: "docker.io/project/model:v1".to_string(),
        });
        
        // Trigger execution spawn here
        println!("✅ Job Claimed. Spinning up Sandbox.");
        spawn_sandbox("job_123", "docker.io/project/model:v1");
    }

    Ok(())
}

// =========================================================================
// MODULE: Sandbox (gVisor / runsc)
// =========================================================================
// This is critical for Student Safety.
// We DO NOT use standard Docker runtime. We use gVisor to intercept syscalls.

fn spawn_sandbox(job_id: &str, image: &str) {
    // Command Construction:
    // docker run 
    //   --runtime=runsc          <-- Google gVisor Isolation
    //   --network=none           <-- No Internet Access (Data Leak Prevention)
    //   --gpus all               <-- Pass-through GPU (if supported/safe)
    //   --rm                     <-- Ephemeral
    //   --volume inputs:/data    <-- Read-only inputs
    //   my_image
    
    println!("🛡️  Initializing gVisor Sandbox for Job: {}", job_id);
    println!("🔒 Network Policy: DENY_ALL");
    
    tokio::spawn(async move {
        // In real code: tokio::process::Command
        println!("⚙️  Container Running...");
        sleep(Duration::from_secs(10)).await; // Simulation
        println!("✅ Container Finished.");
        
        // Handle result submission (Hash calc + On-chain commit)
    });
}

// =========================================================================
// MODULE: Heartbeat (Liveness Proof)
// =========================================================================

async fn send_heartbeat(program: &Program, job_id: &str) -> Result<()> {
    // 1. Gather Telemetry
    // Use `nvml_wrapper` to get GPU usage.
    let gpu_usage = 85; // Mock
    let step_count = 1005;

    println!("💓 Pulse: Job {} at Step {} (GPU: {}%)", job_id, step_count, gpu_usage);

    // 2. Submit to Chain
    // The Smart Contract will Verify: 
    // - Signer == Worker
    // - Timestamp > Last Timestamp
    
    // program.request()
    //     .accounts(...)
    //     .args(instruction::SubmitHeartbeat { gpu_usage, step: step_count })
    //     .send()?;

    Ok(())
}

// =========================================================================
// Utils & Types
// =========================================================================

#[derive(Debug, PartialEq)]
enum WorkerState {
    Idle,
    Assigned(JobContext),
    Verifying,
}

#[derive(Debug, PartialEq)]
struct JobContext {
    job_id: String,
    image_uri: String,
}
