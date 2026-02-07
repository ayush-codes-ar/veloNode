import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import config from '../../config';

/**
 * JobList Component (Mock Backend Version)
 * 
 * Fetches "OPEN" jobs from the centralized backend.
 * Allows workers to "Claim" a job via API.
 */
export const JobList = () => {
    const wallet = useWallet();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Mock Backend: GET /jobs?status=OPEN
            const res = await fetch(`${config.BACKEND_URL}/jobs?status=OPEN`);
            const data = await res.json();
            setJobs(data);
        } catch (err) {
            console.error("Error fetching jobs:", err);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async (jobId) => {
        const username = localStorage.getItem("velo_user");
        if (!username) {
            alert("Please Mint a Profile first!");
            return;
        }

        try {
            // Mock Backend: POST /job/claim
            const response = await fetch(`${config.BACKEND_URL}/job/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: jobId,
                    workerUsername: username
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Claimed Job successfully! View in 'My Workload'.`);
                fetchJobs(); // Refresh list to remove claimed job
                window.location.reload(); // Force refresh of AssignedJobs 
            } else {
                alert("Claim failed: " + data.error);
            }
        } catch (err) {
            console.error("Claim failed:", err);
            alert("Transaction failed: " + err.message);
        }
    };

    return (
        <div className="mb-8">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">
                Available Jobs (Mocknet)
            </h3>

            {loading && jobs.length === 0 ? (
                <div className="text-center py-4 text-gray-500 animate-pulse">Scanning Grid...</div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-8 bg-gray-900 rounded border border-gray-700 border-dashed">
                    <p className="text-gray-400">No Open Jobs Found</p>
                    <p className="text-xs text-gray-600 mt-2">Waiting for Researchers...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => (
                        <div key={job.id} className="bg-gray-700 p-4 rounded hover:bg-gray-600 transition-colors border border-gray-600 flex justify-between items-center group">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                                        {job.dockerURI || "Generic Job"}
                                    </span>
                                    <span className="text-xs text-gray-400">ID: {job.id.slice(0, 8)}...</span>
                                </div>
                                <div className="text-sm text-gray-300">
                                    Requirements: <span className="text-white">{job.requirements?.VRAM || "Any"} VRAM</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Researcher: {job.researcher}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xl font-bold text-green-400 mb-1">
                                    {job.bounty} <span className="text-xs text-gray-400">VELO</span>
                                </div>
                                <button
                                    onClick={() => handleClaim(job.id)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded uppercase font-bold tracking-wide transition-all transform group-hover:scale-105"
                                >
                                    Claim Work
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
