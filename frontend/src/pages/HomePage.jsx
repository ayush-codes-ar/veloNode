import React from 'react';
import Navbar from '../components/Navbar';
import CinematicHero from '../components/CinematicHero';
import HowItWorks from '../components/HowItWorks';
import TechStack from '../components/TechStack';
import Security from '../components/Security';
import Footer from '../components/Footer';

const HomePage = () => {
    return (
        <div className="app-container bg-black">
            <Navbar />
            <CinematicHero />
            <HowItWorks />
            <div className="py-10 bg-black">
                <TechStack />
            </div>
            <Security />
            <Footer />
        </div>
    );
};

export default HomePage;
