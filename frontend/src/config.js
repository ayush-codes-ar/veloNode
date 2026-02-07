const rawUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const config = {
    // Normalize URL: Remove trailing slash if present to avoid double-slash errors in fetch calls
    BACKEND_URL: rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
};

export default config;
