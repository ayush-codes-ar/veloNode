import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import TechStack from '../components/TechStack';
import Security from '../components/Security';
import Footer from '../components/Footer';

const HomePage = () => {
    return (
        <div className="app-container">
            <Navbar />
            <Hero />
            <HowItWorks />
            <div className="py-10">
                <TechStack />
            </div>
            <Security />
            <Footer />
        </div>
    );
};

export default HomePage;
