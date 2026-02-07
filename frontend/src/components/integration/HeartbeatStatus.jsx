import React, { useEffect, useState } from 'react';

/**
 * HeartbeatStatus
 * 
 * Visualizes the "Pulse" of the worker node.
 * In a real deployment, this might subscribe to WebSocket updates from the Worker Daemon 
 * or poll the chain for 'HeartbeatReceived' events.
 */
export const HeartbeatStatus = () => {
    const [stats, setStats] = useState({ gpu: 0, steps: 0, lastSeen: Date.now() });

    useEffect(() => {
        // Simulate live telemetry updates
        const interval = setInterval(() => {
            setStats(prev => ({
                gpu: Math.floor(Math.random() * 20) + 70, // 70-90% usage
                steps: prev.steps + 1,
                lastSeen: Date.now()
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="heartbeat-widget bg-black rounded p-2 text-xs font-mono text-green-500 border border-green-900 mt-2">
            <div className="flex justify-between">
                <span>GPU_UTIL: {stats.gpu}%</span>
                <span>STEP: {stats.steps}</span>
            </div>
            <div className="text-gray-500 text-[10px] mt-1">
                LAST_ONCHAIN_PROOF: {new Date(stats.lastSeen).toLocaleTimeString()}
            </div>

            {/* Visual Pulse Bar */}
            <div className="w-full h-1 bg-gray-900 mt-1 rounded overflow-hidden">
                <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${stats.gpu}%` }}
                />
            </div>
        </div>
    );
};
