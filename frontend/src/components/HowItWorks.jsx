import React, { useRef } from 'react';
import { CircuitBoard, Cpu, CircleDollarSign } from 'lucide-react';
import './HowItWorks.css';

const TiltCard = ({ icon: Icon, title, desc }) => {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;

        const { left, top, width, height } = cardRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        // Calculate rotation (-10 to 10 degrees)
        const rotateX = ((y / height) - 0.5) * -10; // Invert tilt for natural feel
        const rotateY = ((x / width) - 0.5) * 10;

        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };

    return (
        <div
            className="tilt-card"
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="card-icon">
                <Icon size={32} />
            </div>
            <h3 className="card-title">{title}</h3>
            <p className="card-desc">{desc}</p>
        </div>
    );
};

const HowItWorks = () => {
    const steps = [
        {
            icon: CircuitBoard,
            title: 'Connect',
            desc: 'Download the VeloNode client and connect your GPU in seconds. No complex configuration required.'
        },
        {
            icon: Cpu,
            title: 'Compute',
            desc: 'Your hardware automatically processes AI workloads from our global decentralized network.'
        },
        {
            icon: CircleDollarSign,
            title: 'Earn',
            desc: 'Receive real-time rewards for every second of compute power you provide to the grid.'
        }
    ];

    return (
        <section className="how-it-works" id="how-it-works">
            <div className="container">
                <h2 className="how-it-works-title">How It Works</h2>
                <div className="cards-container">
                    {steps.map((step) => (
                        <TiltCard key={step.title} {...step} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
