import React, { useState } from 'react';
import { UserDashboard } from './UserDashboard';
import { JobList } from './JobList';
import { CreateJob } from './CreateJob';
import { AssignedJobs } from './AssignedJobs';
import { HeartbeatStatus } from './HeartbeatStatus';

export const IntegrationDashboard = () => {
    return (
        <div className="integration-dashboard max-w-7xl mx-auto p-4 space-y-6 bg-gray-900 min-h-screen">
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4 pt-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        VeloNode Protocol
                    </h1>
                    <p className="text-gray-400">Decentralized Compute Marketplace (Devnet)</p>
                </div>
            </header>

            {/* Top Row: User Stats & Live Pulse */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <UserDashboard />
                </div>
                <div>
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Node Telemetry</h3>
                        <HeartbeatStatus />
                    </div>
                </div>
            </div>

            {/* Middle Row: Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Researcher Panel */}
                <div className="researcher-panel">
                    <CreateJob />
                </div>

                {/* Worker Panel */}
                <div className="worker-panel bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <JobList />
                    <AssignedJobs />
                </div>
            </div>
        </div>
    );
};
