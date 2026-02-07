import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import config from '../config';

const LoginPage = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inputName, setInputName] = useState("");
    const [inputPass, setInputPass] = useState("");
    const navigate = useNavigate();

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
                    // Save Token
                    localStorage.setItem("velo_token", data.token);
                    localStorage.setItem("velo_user", data.user.username);

                    // Redirect to Dashboard
                    navigate('/dashboard');
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

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <Link to="/" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 hover:opacity-80 transition-opacity">
                        VeloNode
                    </Link>
                    <p className="text-gray-400 mt-2">
                        {isRegistering ? 'Create your decentralized identity' : 'Access the compute marketplace'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Username</label>
                            <input
                                type="text"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Password</label>
                            <input
                                type="password"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                value={inputPass}
                                onChange={(e) => setInputPass(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : (isRegistering ? "Create Account" : "Sign In")}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
