import React from "react";

const NightKingdomLogo = ({ size = 'medium' }) => {
  const sizes = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${sizes[size]} relative`}>
        <svg viewBox="0 0 1000 1000" className="w-full h-full">
          <g fill="currentColor">
            <path d="M500 0c-20 0-40 10-50 30L300 280l-250 50c-20 4-36.7 16.7-40 40-3.3 23.3 6.7 43.3 30 50l200 100v300c0 20 10 40 30 50 20 10 40 10 60 0l170-100 170 100c20 10 40 10 60 0 20-10 30-30 30-50V520l200-100c23.3-6.7 33.3-26.7 30-50-3.3-23.3-20-36-40-40l-250-50L550 30c-10-20-30-30-50-30zM310 400l190-40 190 40v260l-190-95-190 95V400z" />
            <circle cx="500" cy="150" r="50" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default NightKingdomLogo;
