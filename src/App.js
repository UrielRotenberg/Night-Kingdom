import React, { useState, useEffect } from 'react';
import LandingPage from './Components/LandingPage';
import InspectionSystem from './Components/InspectionSystem';
import MobileController from './Components/MobileController';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileView(isMobile);
  }, []);

  return (
    <div className="App">
      {isMobileView ? (
        <MobileController />
      ) : (
        currentPage === 'landing' ? (
          <LandingPage onStartInspection={() => setCurrentPage('inspection')} />
        ) : (
          <InspectionSystem onBack={() => setCurrentPage('landing')} />
        )
      )}
    </div>
  );
};

export default App;