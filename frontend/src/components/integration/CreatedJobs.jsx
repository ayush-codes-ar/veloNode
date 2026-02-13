import React, { useEffect, useState } from 'react';
import { Clock, Hash, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import config from '../../config';

export const CreatedJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCreatedJobs = async () => {
        const username = localStorage.getItem("velo_user");
        if (!username) return;

        try {
            const res = await fetch(`${config.BACKEND_URL}/jobs`);
            const allJobs = await res.json();

            if (Array.isArray(allJobs)) {
                // Filter: I am the researcher
                const myJobs = allJobs.filter(j => j.researcher === username);
                setJobs(myJobs);
            } else {
                setJobs([]);
            }
        } catch (err) {
            console.error("Error fetching created jobs:", err);
        }
    };

    useEffect(() => {
        fetchCreatedJobs();
        const interval = setInterval(fetchCreatedJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (jobId) => {
        const token = localStorage.getItem("velo_token");
        setLoading(true);
        try {
            const response = await fetch(`${config.BACKEND_URL}/job/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId })
            });

            if (response.ok) {
                alert("Job Approved! Reward released to worker.");
                fetchCreatedJobs();
            } else {
                const data = await response.json();
                alert("Approval failed: " + data.error);
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (jobs.length === 0) return null;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-6">
            <h3 className="text-xl font-bold text-white mb-4">Your Compute Requests (Researcher)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                    <div key={job.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-bold text-blue-400 font-mono truncate max-w-[150px]">{job.docker_uri}</h4>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <Hash size={10} />
                                        <span>{job.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                                    ${job.status === 'VERIFYING' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' :
                                        job.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'}`}>
                                    {job.status}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs pt-2">
                                <span className="text-gray-500">Bounty:</span>
                                <span className="text-green-400 font-bold">{job.bounty} VELO</span>
                            </div>

                            {job.worker && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Worker:</span>
                                    <span className="text-white">@{job.worker}</span>
                                </div>
                            )}

                            {job.result_hash && (
                                <div className="mt-2 p-2 bg-black/30 rounded border border-gray-800">
                                    <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1">
                                        <ShieldCheck size={10} /> Worker Hash
                                    </p>
                                    <p className="text-[11px] text-white font-mono break-all">{job.result_hash}</p>
                                </div>
                            )}
                        </div>

                        {job.status === 'VERIFYING' && (
                            <button
                                onClick={() => handleApprove(job.id)}
                                disabled={loading}
                                className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg transition-all"
                            >
                                {loading ? "Releasing..." : "APPROVE & PAYOUT"}
                            </button>
                        )}

                        {job.status === 'FAILED_VERIFICATION' && (
                            <div className="mt-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={14} />
                                <span className="text-red-500 text-[10px] font-bold">HASH MISMATCH - AUTH REJECTED</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
