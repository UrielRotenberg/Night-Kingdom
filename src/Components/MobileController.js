import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import logo from './logo/NightKingdomLogo.png';

const MobileController = () => {
    const [currentCell, setCurrentCell] = useState(0);
    const [debugMsg, setDebugMsg] = useState('מתחבר...');
    const [socketConnected, setSocketConnected] = useState(false);
    const [totalCells] = useState(6);
    const [testCompleted, setTestCompleted] = useState(false);
    const [testStarted, setTestStarted] = useState(false);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io('http://172.20.10.4:3001', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setSocketConnected(true);
            setDebugMsg('מחובר!');
        });

        newSocket.on('connect_error', (error) => {
            setSocketConnected(false);
            setDebugMsg(`שגיאת חיבור: ${error.message}`);
        });

        newSocket.on('cellUpdate', (cellNumber) => {
            setCurrentCell(cellNumber);
            if (cellNumber >= totalCells) {
                setTestCompleted(true);
                setTestStarted(false);
                setDebugMsg('הבדיקה הסתיימה');
            } else {
                setDebugMsg(`עבר לתא ${cellNumber + 1}`);
            }
        });

        newSocket.on('cellSkipped', (cellNumber) => {
            setCurrentCell(cellNumber);
            setDebugMsg(`דילוג על תא ${cellNumber}`);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [totalCells]);

    const activateFlashlight = async () => {
        if (!socketConnected || !testStarted || currentCell >= totalCells) return;
        
        try {
            if (!navigator.mediaDevices) {
                throw new Error('המכשיר לא תומך בגישה למצלמה');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    torch: true
                }
            });
            
            const track = stream.getVideoTracks()[0];
            
            const capabilities = track.getCapabilities();
            const settings = await track.getSettings();
            
            if (!capabilities.torch && !settings.torch) {
                throw new Error('הפנס לא נתמך במכשיר זה');
            }
            
            await track.applyConstraints({
                advanced: [{ torch: true }]
            });
            
            setDebugMsg('הפנס דולק...');
            socket.emit('activateCell', { cellNumber: currentCell });
            
            setTimeout(async () => {
                await track.applyConstraints({
                    advanced: [{ torch: false }]
                });
                stream.getTracks().forEach(track => track.stop());
            }, 2000);
            
        } catch (err) {
            console.error('Flashlight error:', err);
            setDebugMsg(`שגיאה: ${err.message}`);
            socket.emit('activateCell', { cellNumber: currentCell });
        }
    };

    const handleCellActivation = () => {
        if (!socket) return;

        if (!testStarted) {
            setTestStarted(true);
            setTestCompleted(false);
            setCurrentCell(0);
            setDebugMsg('הבדיקה החלה');
            socket.emit('startTest');
            return;
        }

        if (testCompleted) {
            setTestStarted(true);
            setCurrentCell(0);
            setTestCompleted(false);
            setDebugMsg('התחלת בדיקה חדשה');
            socket.emit('resetTest');
            return;
        }

        activateFlashlight();
    };

    useEffect(() => {
        window.activateCell = handleCellActivation;
        return () => {
            window.activateCell = undefined;
        };
    }, [handleCellActivation]);

    const getButtonText = () => {
        if (!testStarted) return 'התחל בדיקה';
        if (testCompleted) return 'התחל בדיקה חדשה';
        return `הפעל תא ${currentCell + 1}`;
    };

    return (
        <div className="min-h-screen bg-[#111111] text-white p-6 flex flex-col items-center justify-center">
            <img src={logo} alt="Night Kingdom Logo" className="mb-8 h-16 w-auto" />
            <h1 className="text-2xl font-bold mb-8">בקר בדיקת תאים</h1>

            {testStarted && (
                <div className="text-xl mb-4">
                    {!testCompleted ? `תא נוכחי: ${currentCell + 1}` : 'הבדיקה הסתיימה'}
                </div>
            )}

            <div className="mb-4 text-sm">
                סטטוס: {socketConnected ? '🟢 מחובר' : '🔴 מנותק'}
            </div>

            <button
                onClick={handleCellActivation}
                disabled={!socketConnected}
                className={`
                    bg-blue-600 hover:bg-blue-700 text-white px-12 py-12 
                    rounded-full text-xl mb-4 transition-all
                    ${!socketConnected ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                    ${!testStarted ? 'bg-green-600 hover:bg-green-700' : ''}
                `}
            >
                {getButtonText()}
            </button>

            <div className="mt-4 p-4 bg-gray-800 rounded text-sm">
                {debugMsg}
            </div>
        </div>
    );
};

export default MobileController;