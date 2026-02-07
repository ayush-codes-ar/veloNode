import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock, Globe } from 'lucide-react';
import './Security.css';

const Security = () => {
    const dividerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (dividerRef.current) {
            observer.observe(dividerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section className="security-section" id="security">
            <div className="security-panel">
                <div className="security-header">
                    <h2 className="security-title">Enterprise-Grade Security</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Built for trustless environments.</p>
                </div>

                <div
                    ref={dividerRef}
                    className={`animated-divider ${isVisible ? 'visible' : ''}`}
                />

                <div className="security-grid">
                    <div className="security-item">
                        <ShieldCheck className="security-icon" size={32} />
                        <h3>gVisor Sandboxing</h3>
                        <p className="security-desc">Process isolation ensures host integrity and prevents container escapes.</p>
                    </div>
                    <div className="security-item">
                        <Lock className="security-icon" size={32} />
                        <h3>End-to-End Encryption</h3>
                        <p className="security-desc">All data in transit and at rest is encrypted with military-grade standards.</p>
                    </div>
                    <div className="security-item">
                        <Globe className="security-icon" size={32} />
                        <h3>Decentralized Verification</h3>
                        <p className="security-desc">Consensus-based proof of compute ensures fair rewards and valid work.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Security;
