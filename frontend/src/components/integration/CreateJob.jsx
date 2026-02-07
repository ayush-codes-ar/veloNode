import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import config from '../../config';

/**
 * CreateJob Component (Mock Backend Version)
 * 
 * Allows Researchers to post jobs.
 * - Spends Credits via Backend API
 * - Creates Job Entry
 */
export const CreateJob = () => {
    const wallet = useWallet();
    const [jobSpec, setJobSpec] = useState({
        image: 'pytorch/pytorch:latest',
        input: 'ipfs://QmInputHash123',
        vram: '8GB',
        bounty: '50'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("velo_token");
        if (!token) {
            alert("No Active Session Found. Please LOGIN first!");
            return;
        }

        setLoading(true);
        try {
            // Mock Backend: POST /job (Protected)
            const response = await fetch(`${config.BACKEND_URL}/job`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dockerURI: jobSpec.image,
                    inputHash: jobSpec.input,
                    VRAM: parseInt(jobSpec.vram),
                    bounty: parseInt(jobSpec.bounty)
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Job Posted! Spent ${jobSpec.bounty} VELO credits.`);
                window.location.reload();
            } else {
                alert("Error: " + data.error);
            }

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl mb-8">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-purple-600 w-2 h-2 rounded-full mr-2"></span>
                Post Compute Job
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-400 text-xs uppercase mb-1">Docker Image</label>
                        <input
                            type="text"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            value={jobSpec.image}
                            onChange={(e) => setJobSpec({ ...jobSpec, image: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs uppercase mb-1">Input Data (IPFS/URL)</label>
                        <input
                            type="text"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            value={jobSpec.input}
                            onChange={(e) => setJobSpec({ ...jobSpec, input: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-400 text-xs uppercase mb-1">Required VRAM</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            value={jobSpec.vram}
                            onChange={(e) => setJobSpec({ ...jobSpec, vram: e.target.value })}
                        >
                            <option value="8GB">8 GB</option>
                            <option value="16GB">16 GB</option>
                            <option value="24GB">24 GB</option>
                            <option value="80GB">80 GB (A100)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs uppercase mb-1">Bounty (VELO)</label>
                        <input
                            type="number"
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white font-mono text-green-400"
                            value={jobSpec.bounty}
                            onChange={(e) => setJobSpec({ ...jobSpec, bounty: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded transition-all transform hover:scale-[1.02] disabled:opacity-50"
                >
                    {loading ? "Processing..." : `Launch Job (-${jobSpec.bounty} Credits)`}
                </button>
            </form>
        </div>
    );
};
