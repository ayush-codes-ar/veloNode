import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config';

export const UserProfile = () => {
    const [username, setUsername] = useState(localStorage.getItem("velo_user") || "");
    const [token, setToken] = useState(localStorage.getItem("velo_token") || "");
    const [credits, setCredits] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${config.BACKEND_URL}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 401 || res.status === 403) {
                    handleLogout();
                    return;
                }

                // Check if response is JSON
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    console.error("Non-JSON profile response");
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
        const interval = setInterval(fetchProfile, 10000);
        return () => clearInterval(interval);

    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.removeItem("velo_user");
        localStorage.removeItem("velo_token");
        navigate('/login');
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Operator Profile</h2>
                    <h3 className="text-2xl font-bold text-white mt-1">{username}</h3>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Vault Balance</p>
                    <p className="text-3xl font-mono text-green-400 font-bold bg-green-400/10 px-3 py-1 rounded-lg inline-block mt-1">
                        {credits !== null ? credits.toLocaleString() : "..."} <span className="text-sm text-gray-500">VELO</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center text-green-400 bg-green-400/10 px-2 py-1 rounded">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                        Active Session
                    </span>
                    <span className="text-gray-500">ID: {token.substring(0, 8)}...</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 transition-colors font-medium hover:bg-red-400/10 px-3 py-1.5 rounded-lg"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};
