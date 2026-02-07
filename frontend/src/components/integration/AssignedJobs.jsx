import React, { useEffect, useState } from 'react';
import config from '../../config';

/**
 * AssignedJobs Component (Secure & Centralized)
 * 
 * Shows jobs claimed by the worker.
 * Allows worker to "Complete & Reward" a job.
 */
export const AssignedJobs = () => {
    const [myJobs, setMyJobs] = useState([]);

    const fetchMyJobs = async () => {
        const username = localStorage.getItem("velo_user");
        if (!username) return;

        try {
            // Mock Backend: GET /jobs
            // We fetch all and filter client side, or backend could support specific query
            const res = await fetch(`${config.BACKEND_URL}/jobs`);
            const allJobs = await res.json();

            // Filter: Worker matches AND status is not OPEN
            const myAssigned = allJobs.filter(j =>
                j.worker === username &&
                j.status !== 'OPEN'
            );

            setMyJobs(myAssigned);
        } catch (err) {
            console.error("Error fetching my jobs:", err);
        }
    };

    useEffect(() => {
        fetchMyJobs();
        const interval = setInterval(fetchMyJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleComplete = async (jobId) => {
        const token = localStorage.getItem("velo_token");
        const resultHash = "QmResultHashMock" + Date.now();

        try {
            // Mock Backend: POST /job/result (Protected)
            const response = await fetch(`${config.BACKEND_URL}/job/result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobId: jobId,
                    resultHash: resultHash
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Job Completed! Reward credited to your account.`);
                fetchMyJobs();
                window.location.reload(); // Refresh credits in Dashboard
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Completion failed: " + err.message);
        }
    };

    if (myJobs.length === 0) return null;

    return (
        <div className="border-t border-gray-700 pt-6 mt-6">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">
                My Workload
            </h3>

            <div className="space-y-4">
                {myJobs.map(job => (
                    <div key={job.id} className="bg-gray-800 p-4 rounded border border-blue-900/50 relative overflow-hidden">
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${job.status === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                                }`}>
                                {job.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <h4 className="text-white font-mono text-sm">{job.id.slice(0, 12)}...</h4>
                        </div>

                        <div className="text-xs text-gray-400 space-y-1 mb-3">
                            <p>Docker: {job.dockerURI}</p>
                            <p>Started: {new Date(job.started_at).toLocaleTimeString()}</p>
                            {job.status === 'COMPLETED' && <p className="text-green-400">Result: {job.resultHash?.slice(0, 10)}...</p>}
                        </div>

                        {job.status === 'ASSIGNED' && (
                            <button
                                onClick={() => handleComplete(job.id)}
                                className="w-full bg-blue-700 hover:bg-blue-600 text-white text-xs py-2 rounded uppercase font-bold transition-colors"
                            >
                                Submit Result (+Reward)
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
