import React, { useState } from 'react';
import LandingPage from './Components/LandingPage';
import InspectionSystem from './Components/InspectionSystem';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');

  return (
    <div className="App">
      {currentPage === 'landing' ? (
        <LandingPage onStartInspection={() => setCurrentPage('inspection')} />
      ) : (
        <InspectionSystem onBack={() => setCurrentPage('landing')} />
      )}
    </div>
  );
};

export default App;