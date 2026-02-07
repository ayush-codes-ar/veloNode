const config = {
    // Default to local mock backend, but allow override via environment variable
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"
};

export default config;
