import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-container">
                <Link to="/" className="navbar-brand">
                    VeloNode
                </Link>
                <div className="navbar-links">
                    <a href="/#how-it-works" className="nav-link">How</a>
                    <a href="/#security" className="nav-link">Security</a>
                    <a href="/#technology" className="nav-link">Technology</a>
                    <a href="#" className="nav-link">Docs</a>
                    <Link to="/dashboard" className="nav-cta">Get Started</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
