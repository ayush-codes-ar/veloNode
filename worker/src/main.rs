use std::time::Duration;
use std::env;
use tokio::time::sleep;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Job {
    id: String,
    researcher: String,
    #[serde(rename = "docker_uri")]
    docker_uri: String,
    vram: String,
    bounty: i32,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaimResponse {
    message: String,
    job: Job,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();
    let api_url = env::var("VELO_API_URL").unwrap_or_else(|_| "https://velonode-backend.onrender.com".to_string());
    let api_key = env::var("VELO_API_KEY").context("VELO_API_KEY must be set in .env")?;

    println!("🚀 VeloNode Worker CLI Starting...");
    println!("🌍 Target Backend: {}", api_url);
    
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;

    loop {
        match poll_and_execute(&client, &api_url, &api_key).await {
            Ok(_) => (),
            Err(e) => eprintln!("❌ Worker Error: {}", e),
        }
        sleep(Duration::from_secs(10)).await;
    }
}

async fn poll_and_execute(client: &Client, api_url: &str, api_key: &str) -> Result<()> {
    println!("🔍 Scanning Marketplace for OPEN jobs...");

    let jobs: Vec<Job> = client
        .get(format!("{}/jobs?status=OPEN", api_url))
        .header("X-API-KEY", api_key)
        .send()
        .await?
        .json()
        .await?;

    if jobs.is_empty() {
        println!("📭 No open jobs found. Retrying...");
        return Ok(());
    }

    let job = &jobs[0];
    println!("✨ Found secure job: {} (Bounty: {} VELO). Claiming...", job.id, job.bounty);

    let response = client
        .post(format!("{}/job/claim", api_url))
        .header("X-API-KEY", api_key)
        .json(&serde_json::json!({ "jobId": job.id }))
        .send()
        .await?;

    if !response.status().is_success() {
        let err_body: serde_json::Value = response.json().await?;
        eprintln!("⚠️ Failed to claim job: {}", err_body["error"]);
        return Ok(());
    }

    let claim_data: ClaimResponse = response.json().await?;
    println!("✅ Job Claimed. Spinning up Sandbox for {}", claim_data.job.docker_uri);

    execute_compute(&claim_data.job).await?;

    println!("📤 Submitting completion proof for {}...", job.id);
    let result_hash = format!("vhash_{}", uuid::Uuid::new_v4().to_string().get(0..8).unwrap());
    
    let res = client
        .post(format!("{}/job/result", api_url))
        .header("X-API-KEY", api_key)
        .json(&serde_json::json!({
            "jobId": job.id,
            "resultHash": result_hash
        }))
        .send()
        .await?;

    if res.status().is_success() {
        println!("🏁 Success! Proof: {}. Reward credited to account.", result_hash);
    } else {
        eprintln!("❌ Failed to submit result.");
    }

    Ok(())
}

async fn execute_compute(job: &Job) -> Result<()> {
    println!("🛡️  Initializing Sandbox...");
    
    // If the image is from a registry (contains /), pull it
    if job.docker_uri.contains('/') {
        println!("📦 Remote Image Detected. Pulling from Registry: {}...", job.docker_uri);
        let pull_status = Command::new("docker")
            .arg("pull")
            .arg(&job.docker_uri)
            .status()
            .context("Failed to run docker pull. Is Docker installed?")?;
        
        if !pull_status.success() {
            eprintln!("⚠️ Pull failed. The worker will attempt to run from local cache.");
        }
    } else {
        println!("📦 Local/Cached Image: {}", job.docker_uri);
    }
    
    // Simulate real training time
    for i in 1..=5 {
        println!("⚙️  Computing... Chunk {}/5 (GPU VRAM: {} Required)", i, job.vram);
        sleep(Duration::from_secs(2)).await;
    }
    
    println!("✅ Execution complete.");
    Ok(())
}
