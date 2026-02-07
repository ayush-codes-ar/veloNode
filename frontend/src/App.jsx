import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import TechStack from './components/TechStack'
import Encryption from './components/Security' // Renaming if needed, assuming default export
import Footer from './components/Footer'
import { IntegrationDashboard } from './components/integration/IntegrationDashboard'

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="pt-20">
        <IntegrationDashboard />
      </div>
      <Hero />
      <HowItWorks />
      <div className="py-10">
        <TechStack />
      </div>
      <Security />
      <Footer />
    </div>
  )
}

export default App
