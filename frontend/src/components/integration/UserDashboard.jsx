import React, { useState, useEffect } from 'react';
import config from '../../config';

/**
 * UserDashboard Component (Secure Production Version)
 * 
 * Manages User Identity via JWT Authentication.
 * - Register/Login with Password
 * - Persists JWT in localStorage
 * - Displays VELO Credits from protected profile endpoint
 */
export const UserDashboard = () => {
    const [username, setUsername] = useState(localStorage.getItem("velo_user") || "");
    const [token, setToken] = useState(localStorage.getItem("velo_token") || "");
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const [inputName, setInputName] = useState("");
    const [inputPass, setInputPass] = useState("");

    // Fetch credits from protected profile endpoint
    useEffect(() => {
        if (!token) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${config.BACKEND_URL}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }

                const data = await res.json();
                if (res.ok) {
                    setCredits(data.credits);
                    setUsername(data.username);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        fetchProfile();
        const interval = setInterval(fetchProfile, 10000); // Poll every 10s
        return () => clearInterval(interval);

    }, [token]);

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!inputName || !inputPass) return alert("Enter credentials");
        setLoading(true);

        const endpoint = isRegistering ? '/user/register' : '/user/login';

        try {
            const response = await fetch(`${config.BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: inputName, password: inputPass })
            });

            const data = await response.json();

            if (response.ok) {
                if (isRegistering) {
                    alert("Registration successful! Please login.");
                    setIsRegistering(false);
                    setInputPass("");
                } else {
                    localStorage.setItem("velo_token", data.token);
                    localStorage.setItem("velo_user", data.user.username);
                    setToken(data.token);
                    setUsername(data.user.username);
                    setCredits(data.user.credits);
                }
            } else {
                alert("Error: " + data.error);
            }

        } catch (err) {
            console.error(err);
            alert("Connection failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("velo_user");
        localStorage.removeItem("velo_token");
        setUsername("");
        setToken("");
        setCredits(null);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl min-h-[220px]">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${token ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {token ? 'Secure Profile' : 'Access Protocol'}
            </h2>

            {!token ? (
                <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
                    <p className="text-gray-400 text-sm">
                        {isRegistering ? 'Create a secure vault for your compute credits.' : 'Login to access the decentralized marketplace.'}
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        <input
                            type="text"
                            placeholder="Username"
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={inputPass}
                            onChange={(e) => setInputPass(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            {isRegistering ? "Back to Login" : "Need an account? Register"}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition-all disabled:opacity-50"
                        >
                            {loading ? "Verifying..." : (isRegistering ? "Register" : "Login")}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Operator</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{username}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Vault Balance</p>
                            <p className="text-3xl font-mono text-green-400">
                                {credits !== null ? credits.toLocaleString() : "..."} <span className="text-sm text-gray-500">VELO</span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            JWT_ACTIVE
                        </div>
                        <div className="flex items-center text-green-500">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                            Production_Ready
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};
