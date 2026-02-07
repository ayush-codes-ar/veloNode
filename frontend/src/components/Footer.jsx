import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-divider"></div>
            <div className="footer-content">
                <div className="footer-brand">
                    &copy; {new Date().getFullYear()} VeloNode. Open. Free. Decentralized.
                </div>
                <div className="footer-nav">
                    <a href="#">Github</a>
                    <a href="#">Twitter</a>
                    <a href="#">Discord</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
