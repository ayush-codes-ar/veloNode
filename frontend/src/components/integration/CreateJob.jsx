import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Check, ChevronRight, ChevronLeft, Cpu, Database, Rocket } from 'lucide-react';
import config from '../../config';

export const CreateJob = () => {
    const [step, setStep] = useState(1);
    const [isAutoBuild, setIsAutoBuild] = useState(false);
    const [files, setFiles] = useState({ code: null, data: null });
    const [jobSpec, setJobSpec] = useState({
        image: 'pytorch/pytorch:latest',
        input: 'ipfs://QmInputHash123',
        vram: '8GB',
        bounty: '50',
        entryFile: 'main.py',
        runCommand: 'python main.py',
        verificationHash: ''
    });
    const [loading, setLoading] = useState(false);
    const [buildStatus, setBuildStatus] = useState(''); // 'uploading', 'building', 'success', 'error'
    const stepRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(stepRef.current,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
        );
    }, [step]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem("velo_token");
        if (!token) return alert("No active session found.");

        setLoading(true);
        let finalImage = jobSpec.image;

        try {
            // 1. If Auto-Build, build the image first
            if (isAutoBuild) {
                setBuildStatus('uploading');
                const formData = new FormData();
                formData.append('code', files.code);
                if (files.data) formData.append('data', files.data);
                formData.append('entryFile', jobSpec.entryFile);
                formData.append('runCommand', jobSpec.runCommand);

                const buildRes = await fetch(`${config.BACKEND_URL}/job/build`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!buildRes.ok) {
                    const err = await buildRes.json();
                    throw new Error(err.logs || err.error || "Build Failed");
                }

                const buildData = await buildRes.json();
                finalImage = buildData.imageName;
                setBuildStatus('success');
            }

            // 2. Post the Job
            const response = await fetch(`${config.BACKEND_URL}/job`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dockerURI: finalImage,
                    inputHash: jobSpec.input,
                    VRAM: parseInt(jobSpec.vram),
                    bounty: parseInt(jobSpec.bounty),
                    verificationHash: jobSpec.verificationHash
                })
            });

            if (response.ok) {
                setStep(4);
            } else {
                const data = await response.json();
                alert("Error: " + data.error);
            }

        } catch (err) {
            console.error(err);
            setBuildStatus('error');
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div ref={stepRef} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2 text-blue-400">
                                <Database size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">Step 1: Container Spec</span>
                            </div>
                            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                                <button
                                    onClick={() => setIsAutoBuild(false)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isAutoBuild ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    ADVANCED
                                </button>
                                <button
                                    onClick={() => setIsAutoBuild(true)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isAutoBuild ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    UPLOAD PROJECT
                                </button>
                            </div>
                        </div>

                        {!isAutoBuild ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase mb-1 font-bold">Public Docker Image</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 transition-colors"
                                        value={jobSpec.image}
                                        onChange={(e) => setJobSpec({ ...jobSpec, image: e.target.value })}
                                        placeholder="e.g. pytorch/pytorch:latest"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase mb-1 font-bold">Input Data (IPFS/URL)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 transition-colors"
                                        value={jobSpec.input}
                                        onChange={(e) => setJobSpec({ ...jobSpec, input: e.target.value })}
                                        placeholder="ipfs://..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-[10px] uppercase mb-1 font-bold">Code Folder (.zip)</label>
                                        <input
                                            type="file"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-[10px]"
                                            onChange={(e) => setFiles({ ...files, code: e.target.files[0] })}
                                            accept=".zip"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-[10px] uppercase mb-1 font-bold">Dataset (.zip)</label>
                                        <input
                                            type="file"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-[10px]"
                                            onChange={(e) => setFiles({ ...files, data: e.target.files[0] })}
                                            accept=".zip"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-[10px] uppercase mb-1 font-bold">Entry File</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                                            value={jobSpec.entryFile}
                                            onChange={(e) => setJobSpec({ ...jobSpec, entryFile: e.target.value })}
                                            placeholder="main.py"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-[10px] uppercase mb-1 font-bold">Run Command</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                                            value={jobSpec.runCommand}
                                            onChange={(e) => setJobSpec({ ...jobSpec, runCommand: e.target.value })}
                                            placeholder="python main.py"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={nextStep}
                            disabled={isAutoBuild && !files.code}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4 disabled:opacity-50"
                        >
                            <span>Configure Resources</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div ref={stepRef} className="space-y-4">
                        <div className="flex items-center space-x-2 text-purple-400 mb-4">
                            <Cpu size={18} />
                            <span className="text-sm font-bold uppercase tracking-wider">Step 2: Resource Requirements</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-xs uppercase mb-1">Required VRAM</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 transition-colors"
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
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-green-400 focus:border-purple-500 transition-colors"
                                    value={jobSpec.bounty}
                                    onChange={(e) => setJobSpec({ ...jobSpec, bounty: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="pt-2">
                            <label className="block text-gray-400 text-xs uppercase mb-1">
                                Anti-Cheat: Golden Hash (Optional)
                            </label>
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-purple-500 transition-colors"
                                value={jobSpec.verificationHash || ''}
                                onChange={(e) => setJobSpec({ ...jobSpec, verificationHash: e.target.value })}
                                placeholder="e.g. SHA256 of expected output"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 italic">
                                * Providing a hash enables <b>Instant Worker Payout</b> if results match.
                                Otherwise, you must manually approve the work.
                            </p>
                        </div>
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={prevStep}
                                className="flex-1 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                <ChevronLeft size={18} />
                                <span>Back</span>
                            </button>
                            <button
                                onClick={nextStep}
                                className="flex-[2] flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                <span>Review & Launch</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div ref={stepRef} className="space-y-6">
                        <div className="flex items-center space-x-2 text-yellow-400 mb-4">
                            <Rocket size={18} />
                            <span className="text-sm font-bold uppercase tracking-wider">Step 3: Final Review</span>
                        </div>

                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-xs uppercase">Image</span>
                                <span className="text-white font-mono text-sm">{jobSpec.image}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-xs uppercase">Input</span>
                                <span className="text-white font-mono text-sm truncate max-w-[200px]">{jobSpec.input}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 text-xs uppercase">Compute</span>
                                <span className="text-white font-bold">{jobSpec.vram} Node</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-800">
                                <span className="text-gray-400">Total Reward</span>
                                <span className="text-green-400 font-bold">{jobSpec.bounty} VELO</span>
                            </div>
                        </div>

                        {loading && isAutoBuild && (
                            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                    <span className="text-blue-400">Build Status</span>
                                    <span className="text-white animate-pulse">{buildStatus}...</span>
                                </div>
                                <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-blue-500 transition-all duration-700 ${buildStatus === 'uploading' ? 'w-1/3' : buildStatus === 'building' ? 'w-2/3' : 'w-full'}`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                onClick={prevStep}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center space-x-2 border border-gray-700 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                            >
                                <ChevronLeft size={18} />
                                <span>Back</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-[2] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                            >
                                {loading ? (buildStatus === 'building' ? "Compiling Image..." : "Broadcasting...") : "Confirm & Launch"}
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div ref={stepRef} className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Job Deployed!</h3>
                        <p className="text-gray-400">Your compute request is now live in the marketplace.</p>
                        <button
                            onClick={() => {
                                setStep(1);
                                window.location.reload();
                            }}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg border border-gray-700 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-900">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">Launch Compute</h3>
                    <p className="text-gray-500 text-xs">Decentralized Execution Wizard</p>
                </div>
                <div className="flex space-x-1">
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${step >= i ? 'bg-blue-500' : 'bg-gray-700'}`}
                        />
                    ))}
                </div>
            </div>

            {renderStep()}
        </div>
    );
};

