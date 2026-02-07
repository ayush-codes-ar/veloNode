# 🛠️ VeloNode Worker Setup Guide

Follow these steps to turn your laptop into a high-performance compute node on the VeloNode network.

## 📋 Prerequisites

Before you begin, ensure your laptop has the following installed:

1.  **Rust Toolchain**: 
    - Install via [rustup.rs](https://rustup.rs/).
    - Check version: `rustc --version` (Minimum 1.70+ recommended).

2.  **Docker**:
    - **Windows/Mac**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
    - **Linux**: Install `docker.io`.
    - *Note: Ensure your user is in the `docker` group or run as sudo.*

3.  **GPU Support (Optional but Recommended)**:
    - For NVIDIA GPUs, install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).
    - This allows the worker to pass your physical VRAM into the training containers.

## 🚀 Getting Started

### 1. Clone & Enter Directory
```bash
git clone <your-repo-url>
cd velonode/worker
```

### 2. Configure (Optional)
Open `src/main.rs` and ensure `API_URL` points to the live backend:
```rust
const API_URL: &str = "https://velonode-backend.onrender.com";
```

### 3. Run the Worker
```bash
cargo run
```

## 🛡️ How it Works
1.  **Polling**: The worker periodically checks the VeloNode marketplace for `OPEN` jobs.
2.  **Claiming**: When it finds a job matching its idle state, it sends a claim request.
3.  **Sandbox**: It pulls the requested Docker image and runs it in a secure sandbox.
4.  **Proof of Work**: Once complete, it submits a cryptographic completion hash to the backend.
5.  **Reward**: Your vault credits will increase automatically once the proof is verified in the dashboard!

## 📦 Distribution (For Friends without Rust)

If your friend doesn't want to install Rust, you can generate a single file for them:

1.  **On your laptop** (where you have Rust), run:
    ```bash
    cd worker
    cargo build --release
    ```
2.  **Locate the file**:
    - Go to `worker/target/release/`.
    - You will find a file named `velonode-worker.exe` (Windows) or `velonode-worker` (Linux).
3.  **Share it**: Send this single file to your friend.

**Prerequisites for your friend (Standalone version):**
*   **Docker Desktop** (Must be installed and running).
*   That’s it! No Rust or GitHub is required for them.
