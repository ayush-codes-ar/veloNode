import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import Overview from './components/dashboard/Overview';
import Marketplace from './components/dashboard/Marketplace';
import MyNodes from './components/dashboard/MyNodes';

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={<DashboardPage />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="marketplace" element={<Marketplace />} />
                    <Route path="nodes" element={<MyNodes />} />
                    <Route path="settings" element={<div className="text-white p-6">Settings Module (Coming Soon)</div>} />
                </Route>
            </Routes>
        </Router>
    );
};

export default AppRouter;
