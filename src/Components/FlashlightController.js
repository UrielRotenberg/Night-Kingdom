import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const FlashlightController = () => {
    const [isActive, setIsActive] = useState(false);
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('מתחבר...');
    const [error, setError] = useState('');

    useEffect(() => {
        const newSocket = io('http://172.20.10.4:3001', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            setStatus('מחובר');
        });

        newSocket.on('connect_error', () => {
            setStatus('שגיאת חיבור');
        });

        setSocket(newSocket);

        return () => newSocket.disconnect();
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
            
            setIsActive(true);
            setStatus('אור דולק');
            
            setTimeout(async () => {
                await track.applyConstraints({
                    advanced: [{ torch: false }]
                });
                stream.getTracks().forEach(track => track.stop());
                setIsActive(false);
                setStatus('מחובר');
            }, 2000);
            
        } catch (err) {
            console.error('Flashlight error:', err);
            alert('שגיאה בהפעלת הפנס. נא לוודא שיש הרשאות מתאימות.');
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center gap-4">
            <button 
                onClick={activateFlashlight}
                disabled={!socket}
                className={`px-12 py-12 rounded-full text-xl font-bold transition-colors
                    ${isActive ? 'bg-yellow-500' : 'bg-blue-600'} 
                    ${!socket ? 'opacity-50' : ''} text-white`}
            >
                {isActive ? 'כבה אור' : 'הדלק אור'}
            </button>
            <div className="text-white">{status}</div>
            {error && (
                <div className="text-red-500 bg-gray-800 p-4 rounded max-w-sm text-sm">
                    {error}
                </div>
            )}
        </div>
    );
};

export default FlashlightController;