import React from 'react';
import { CreateJob } from '../integration/CreateJob';
import { JobList } from '../integration/JobList';

const Marketplace = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Compute Marketplace</h1>
                <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-500/30">
                    Devnet Live
                </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-white">Launch New Job</h2>
                        <p className="text-gray-400 text-sm">Deploy containers to the decentralized network.</p>
                    </div>
                    <CreateJob />
                </div>

                <div>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-white">Available Contracts</h2>
                        <p className="text-gray-400 text-sm">Browse and claim open compute tasks.</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[600px] overflow-y-auto custom-scrollbar">
                        <JobList />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Marketplace;
