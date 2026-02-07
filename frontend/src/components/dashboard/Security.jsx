import React, { useState, useEffect } from 'react';
import { Key, Shield, Plus, Trash2, Copy, Check } from 'lucide-react';
import config from '../../config';

const Security = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedKey, setCopiedKey] = useState(null);
    const [label, setLabel] = useState('');

    const fetchKeys = async () => {
        const token = localStorage.getItem('velo_token');
        try {
            const res = await fetch(`${config.BACKEND_URL}/user/api-keys`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setKeys(data);
        } catch (err) {
            console.error('Failed to fetch keys');
        } finally {
            setLoading(false);
        }
    };

    const generateKey = async () => {
        const token = localStorage.getItem('velo_token');
        try {
            const res = await fetch(`${config.BACKEND_URL}/user/api-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ label: label || 'My Worker' })
            });
            if (res.ok) {
                setLabel('');
                fetchKeys();
            }
        } catch (err) {
            console.error('Failed to generate key');
        }
    };

    const revokeKey = async (key) => {
        const token = localStorage.getItem('velo_token');
        try {
            await fetch(`${config.BACKEND_URL}/user/api-key/${key}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchKeys();
        } catch (err) {
            console.error('Failed to revoke key');
        }
    };

    const copyToClipboard = (key) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-600/20 p-2 rounded-lg">
                    <Shield className="text-blue-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Security & API</h2>
                    <p className="text-gray-400 text-sm">Manage hardware authentication keys for your workers.</p>
                </div>
            </div>

            {/* Generate Key */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Create Worker Key</h3>
                <div className="flex space-x-3">
                    <input
                        type="text"
                        placeholder="Key Label (e.g. My RTX 3090)"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 transition-all outline-none"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                    <button
                        onClick={generateKey}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all"
                    >
                        <Plus size={16} />
                        <span>Generate</span>
                    </button>
                </div>
            </div>

            {/* Key List */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Active Keys</h3>
                {loading ? (
                    <div className="text-gray-500 text-sm py-4">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-xl p-8 text-center">
                        <Key className="mx-auto text-gray-600 mb-2" size={32} />
                        <p className="text-gray-500 text-sm">No active API keys found.</p>
                    </div>
                ) : (
                    keys.map((k) => (
                        <div key={k.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between group hover:border-gray-700 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white text-sm">{k.label}</span>
                                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase">Worker</span>
                                </div>
                                <div className="flex items-center space-x-2 font-mono text-xs text-blue-400/80">
                                    <span>{k.key}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => copyToClipboard(k.key)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                                    title="Copy to Clipboard"
                                >
                                    {copiedKey === k.key ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                                <button
                                    onClick={() => revokeKey(k.key)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Revoke Key"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-[10px] text-yellow-500/80 leading-relaxed uppercase font-bold tracking-tight">
                    Warning: Anyone with your API Key can claim jobs on your behalf. Keep your keys secret and revoke them if compromised.
                </p>
            </div>
        </div>
    );
};

export default Security;
