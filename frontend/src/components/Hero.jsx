import React, { useEffect, useRef } from 'react';
import Button from './ui/Button';
import './Hero.css';

const Hero = () => {
    const heroRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!heroRef.current) return;
            const { clientX, clientY } = e;
            const { left, top, width, height } = heroRef.current.getBoundingClientRect();

            // Calculate normalized mouse position (0 to 1)
            const x = (clientX - left) / width;
            const y = (clientY - top) / height;

            heroRef.current.style.setProperty('--mouse-x', x);
            heroRef.current.style.setProperty('--mouse-y', y);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section className="hero" ref={heroRef}>
            <div className="hero-content">
                <h1 className="hero-title">
                    Turn Idle GPUs Into a <br />
                    <span className="text-gradient">Global AI Supercomputer</span>
                </h1>
                <p className="hero-subtitle">
                    VeloNode connects decentralized power to the AI revolution.
                    Earn by sharing your compute.
                </p>
                <div className="hero-actions">
                    <Button variant="primary">Start Computing</Button>
                    <Button variant="outline">Read Documentation</Button>
                </div>
            </div>
            <div className="hero-background-glow"></div>
        </section>
    );
};

export default Hero;
