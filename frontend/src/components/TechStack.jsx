import React from 'react';
import './TechStack.css';

const TechStack = () => {
    const technologies = [
        "C++ & NVML",
        "gVisor",
        "Solana",
        "React",
        "GSAP",
        "Node.js",
        "WebGL"
    ];

    return (
        <section className="tech-stack" id="technology">
            <div className="container">
                <h2 className="tech-title">Powered By Modern Infrastructure</h2>
                <div className="tech-grid">
                    {technologies.map((tech) => (
                        <div key={tech} className="tech-badge">
                            {tech}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TechStack;
