import React, { useEffect, useState } from 'react';
import { Tag, Cpu, User, ArrowUpRight, Database } from 'lucide-react';
import config from '../../config';

export const JobList = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${config.BACKEND_URL}/jobs?status=OPEN`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setJobs(data);
            } else {
                console.error("Jobs data is not an array:", data);
                setJobs([]);
            }
        } catch (err) {
            console.error("Error fetching jobs:", err);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async (jobId) => {
        const token = localStorage.getItem("velo_token");
        if (!token) {
            alert("Please LOGIN first to claim work!");
            return;
        }

        try {
            const response = await fetch(`${config.BACKEND_URL}/job/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId })
            });

            const data = await response.json();

            if (response.ok) {
                // Better would be a toast, but using alert for now
                alert(`Claimed Job successfully!`);
                fetchJobs();
                window.location.reload();
            } else {
                alert("Claim failed: " + data.error);
            }
        } catch (err) {
            console.error("Claim failed:", err);
            alert("Transaction failed: " + err.message);
        }
    };

    return (
        <div className="space-y-4">
            {loading && jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm font-medium">Scanning network for tasks...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tag className="text-gray-600" size={32} />
                    </div>
                    <h4 className="text-white font-bold text-lg">No Active Contracts</h4>
                    <p className="text-gray-500 text-sm mt-1">Check back soon for new compute requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/50 p-5 rounded-2xl transition-all group relative overflow-hidden"
                        >
                            {/* Accent Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/10 transition-all duration-500" />

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Cpu className="text-blue-400" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold leading-none">{job.dockerURI}</h4>
                                            <p className="text-gray-500 text-[10px] uppercase font-mono mt-1 tracking-widest">{job.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <Database size={14} />
                                            <span className="text-xs font-semibold">{job.vram || job.requirements?.VRAM || "8GB"} VRAM</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <User size={14} />
                                            <span className="text-xs">{job.researcher}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 group-hover:translate-x-1 transition-transform">
                                    <div className="space-y-0.5 text-right">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Bounty</p>
                                        <p className="text-2xl font-black text-green-400 font-mono italic">
                                            {job.bounty}<span className="text-xs ml-1 text-gray-500 not-italic uppercase font-sans">VELO</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleClaim(job.id)}
                                        className="flex items-center gap-2 bg-white hover:bg-green-400 text-black px-5 py-2 rounded-xl text-sm font-black transition-all active:scale-95"
                                    >
                                        <span>CLAIM</span>
                                        <ArrowUpRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

