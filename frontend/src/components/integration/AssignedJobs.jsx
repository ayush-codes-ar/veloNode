import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, Clock, Hash, ExternalLink } from 'lucide-react';
import config from '../../config';

export const AssignedJobs = () => {
    const [myJobs, setMyJobs] = useState([]);

    const fetchMyJobs = async () => {
        const username = localStorage.getItem("velo_user");
        if (!username) return;

        try {
            const res = await fetch(`${config.BACKEND_URL}/jobs`);
            const allJobs = await res.json();

            if (Array.isArray(allJobs)) {
                const myAssigned = allJobs.filter(j =>
                    j.worker === username &&
                    j.status !== 'OPEN'
                );
                setMyJobs(myAssigned);
            } else {
                setMyJobs([]);
            }
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
            const response = await fetch(`${config.BACKEND_URL}/job/result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId, resultHash })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Job Completed! Reward credited to your account.`);
                fetchMyJobs();
                window.location.reload();
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Completion failed: " + err.message);
        }
    };

    if (myJobs.length === 0) return (
        <div className="text-center py-10 bg-gray-900/30 rounded-2xl border border-gray-800">
            <p className="text-gray-500 text-sm italic">No active workload assigned to this operator.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {myJobs.map(job => {
                const isCompleted = job.status === 'COMPLETED';
                return (
                    <div
                        key={job.id}
                        className={`bg-gray-800/40 border p-5 rounded-2xl transition-all relative overflow-hidden group
                            ${isCompleted ? 'border-green-500/20' : 'border-blue-500/20'}`}
                    >
                        {/* Background Pulsing Glow */}
                        {!isCompleted && <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />}

                        <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10 font-bold uppercase">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                                        {isCompleted ? <CheckCircle className="text-green-400" size={20} /> : <Play className="text-blue-400" size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-white text-base tracking-tight">{job.dockerURI}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {job.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] mt-1">
                                            <Hash size={10} />
                                            <span>{job.id.slice(0, 16)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-600">Time Started</p>
                                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                            <Clock size={12} />
                                            <span>{new Date(job.started_at).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    {isCompleted && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-600">Verification Hash</p>
                                            <div className="flex items-center gap-1.5 text-green-500/70 text-xs truncate">
                                                <ExternalLink size={12} />
                                                <span>{job.resultHash?.slice(0, 12)}...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4">
                                <div className="text-right flex-1 md:flex-none">
                                    <p className="text-[10px] text-gray-500">Reward</p>
                                    <p className="text-xl font-black text-white font-mono">{job.bounty} <span className="text-[10px] text-gray-600">VELO</span></p>
                                </div>

                                {!isCompleted && (
                                    <button
                                        onClick={() => handleComplete(job.id)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                    >
                                        COMPLETE TASK
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

