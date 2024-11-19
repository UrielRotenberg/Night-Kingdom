import React from 'react';

const LandingPage = ({ onStartInspection }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-10 bg-repeat"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-screen p-4">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold text-white mb-4 animate-fade-in">
            ממלכת הלילה
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            מערכת בדיקת תאים מתקדמת
          </p>
          <button
            onClick={onStartInspection}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xl px-12 py-4 rounded-lg 
                     shadow-lg transition-all duration-300 hover:scale-105 
                     flex items-center justify-center gap-2"
          >
            התחל בדיקה
            <span className="text-3xl">&larr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;