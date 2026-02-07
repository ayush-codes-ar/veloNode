import React from 'react';
import { UserProfile } from './UserProfile';
import { HeartbeatStatus } from '../integration/HeartbeatStatus';
import { AssignedJobs } from '../integration/AssignedJobs';

const Overview = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>

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
        </div>
    );
};

export default Overview;
