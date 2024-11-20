import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const MobileController = () => {
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);
  const [currentCell, setCurrentCell] = useState(0);
  const socket = io('http://localhost:3001');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('cellUpdate', (cellNumber) => {
      setCurrentCell(cellNumber);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const activateFlashlight = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = stream.getVideoTracks()[0];
      
      await track.applyConstraints({
        advanced: [{ torch: true }]
      });
      setIsFlashlightActive(true);
      
      socket.emit('flashlightActivated', { cell: currentCell });

      setTimeout(async () => {
        await track.applyConstraints({
          advanced: [{ torch: false }]
        });
        stream.getTracks().forEach(track => track.stop());
        setIsFlashlightActive(false);
      }, 1000);

    } catch (err) {
      console.error('Flashlight error:', err);
      alert('שגיאה בהפעלת הפנס');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-8">בקר בדיקת תאים</h1>
      
      <div className="text-xl mb-4">
        תא נוכחי: {currentCell + 1}
      </div>

      <button
        onClick={activateFlashlight}
        disabled={isFlashlightActive}
        className={`
          p-12 rounded-full text-white font-bold text-xl
          ${isFlashlightActive 
            ? 'bg-yellow-600 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 animate-pulse'}
        `}
      >
        {isFlashlightActive ? 'פנס פעיל...' : 'הפעל פנס'}
      </button>
    </div>
  );
};

export default MobileController;