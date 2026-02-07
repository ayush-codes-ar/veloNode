import React, { useState } from 'react';
import { HelpCircle, X, BookOpen, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export const HelpSupport = () => {
    const [isOpen, setIsOpen] = useState(false);

    const faqs = [
        { q: "How do I earn VELO tokens?", a: "Download the CLI and connect your GPU to start claiming available compute jobs.", icon: Zap },
        { q: "What images are supported?", a: "Any Docker container from DockerHub or private registries can be deployed.", icon: BookOpen },
        { q: "Is my data secure?", a: "All communication is encrypted, and workers execute tasks in isolated sandboxes.", icon: ShieldCheck }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95
                    ${isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/50 hover:scale-110'}
                `}
            >
                {isOpen ? <X className="text-white" size={28} /> : <HelpCircle className="text-white" size={28} />}
            </button>

            {/* Overlay Panel */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] max-w-[calc(100vw-48px)] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                    <div className="p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-b border-gray-800">
                        <h3 className="text-xl font-bold text-white">Grid Support</h3>
                        <p className="text-gray-400 text-xs mt-1">Need help with your compute nodes?</p>
                    </div>

                    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                        {faqs.map((faq, i) => {
                            const Icon = faq.icon;
                            return (
                                <div key={i} className="group cursor-default">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="p-1.5 bg-gray-800 rounded-md group-hover:bg-blue-500/20 transition-colors">
                                            <Icon className="text-blue-400" size={12} />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-200">{faq.q}</h4>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed pl-8">{faq.a}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-gray-900/50 border-t border-gray-800 flex items-center justify-between">
                        <button className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors bg-gray-800 px-3 py-2 rounded-lg">
                            <MessageSquare size={14} />
                            <span>Contact Operator</span>
                        </button>
                        <span className="text-[10px] text-gray-600 font-mono font-bold uppercase">Grid Status: Active</span>
                    </div>
                </div>
            )}
        </div>
    );
};
