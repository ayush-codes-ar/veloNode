import React, { useState } from 'react';
import { UserProfile } from './UserProfile';
import { HeartbeatStatus } from '../integration/HeartbeatStatus';
import { AssignedJobs } from '../integration/AssignedJobs';
import { CreatedJobs } from '../integration/CreatedJobs';
import Security from './Security';
import { LayoutGrid, ShieldAlert } from 'lucide-react';

const Overview = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <LayoutGrid size={16} />
                        <span>Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <ShieldAlert size={16} />
                        <span>Security & API</span>
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <UserProfile />
                        </div>
                        <div>
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full">
                                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4 font-semibold">Node Telemetry</h3>
                                <HeartbeatStatus />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Active Workload</h3>
                        <AssignedJobs />
                    </div>

                    <CreatedJobs />
                </div>
            ) : (
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">
                    <Security />
                </div>
            )}
        </div>
    );
};

export default Overview;
