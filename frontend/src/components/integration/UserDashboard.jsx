import React, { useState, useEffect } from 'react';
import config from '../../config';

/**
 * UserDashboard Component (Mock Backend Version)
 * 
 * Manages User Identity via centralized mock server.
 * - Creates/Fetches User Profile
 * - Displays VELO Credits
 */
export const UserDashboard = () => {
    const [username, setUsername] = useState(localStorage.getItem("velo_user") || "");
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(false);
    const [inputName, setInputName] = useState("");

    // Poll for credit updates
    useEffect(() => {
        if (!username) return;

        const fetchCredits = async () => {
            try {
                // In a real app we'd have a specific GET /user/:id endpoint.
                // Here we fetch all and filter, or re-post to get current state (idempotent).
                // Let's stick to the implementation plan: GET /users and filter.
                const res = await fetch(`${config.BACKEND_URL}/users`);
                const users = await res.json();
                const myUser = users.find(u => u.username === username);

                if (myUser) {
                    setCredits(myUser.credits);
                }
            } catch (err) {
                console.error("Error fetching credits:", err);
            }
        };

        fetchCredits();
        const interval = setInterval(fetchCredits, 5000); // Poll every 5s
        return () => clearInterval(interval);

    }, [username]);

    const handleCreateUser = async () => {
        if (!inputName) return alert("Enter a username");
        setLoading(true);

        try {
            // Call Mock Backend: Create or Get User
            const response = await fetch(`${config.BACKEND_URL}/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: inputName })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("velo_user", data.user.username);
                setUsername(data.user.username);
                setCredits(data.user.credits);
                alert(data.message);
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

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-blue-600 w-2 h-2 rounded-full mr-2"></span>
                User Profile (Mocknet)
            </h2>

            {!username ? (
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                        Create a profile to start earning or spending VELO credits.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Username"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                        />
                        <button
                            onClick={handleCreateUser}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50"
                        >
                            {loading ? "Minting..." : "Mint Profile"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Username</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{username}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Balance</p>
                            <p className="text-3xl font-mono text-green-400">
                                {credits !== null ? credits.toLocaleString() : "..."} <span className="text-sm text-gray-500">VELO</span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-sm">
                        <span className="text-gray-500">Status: Active</span>
                        <div className="flex items-center text-green-500">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                            Mocknet Connected
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            localStorage.removeItem("velo_user");
                            setUsername("");
                            setCredits(null);
                        }}
                        className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};
