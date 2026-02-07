import React from 'react';
import { HeartbeatStatus } from '../integration/HeartbeatStatus';

const MyNodes = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-white">My Worker Nodes</h1>

            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                <div className="max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🖥️</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Connect New Worker</h2>
                    <p className="text-gray-400 mb-6">
                        Download the VeloNode Worker CLI to start earning tokens by creating a compute node.
                    </p>
                    <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors border border-gray-600">
                        Download Worker (v0.1.0-alpha)
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4 font-semibold">Active Node Telemetry (Simulation)</h3>
                <HeartbeatStatus />
            </div>
        </div>
    );
};

export default MyNodes;
