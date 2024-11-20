import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import NightKingdomLogo from './logo/NightKingdomLogo';

const MobileController = () => {
    const [currentCell, setCurrentCell] = useState(0);
    const [debugMsg, setDebugMsg] = useState('מתחבר...');
    const [socketConnected, setSocketConnected] = useState(false);
    const [totalCells] = useState(6);
    const [testCompleted, setTestCompleted] = useState(false);
    const [testStarted, setTestStarted] = useState(false);

    useEffect(() => {
        const socket = io('http://172.20.10.4:3001', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Connected to server');
            setSocketConnected(true);
            setDebugMsg('מחובר!');
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setSocketConnected(false);
            setDebugMsg(`שגיאת חיבור: ${error.message}`);
        });

        socket.on('cellUpdate', (cellNumber) => {
            console.log('Received cell update:', cellNumber);
            setCurrentCell(cellNumber);
            if (cellNumber >= totalCells) {
                setTestCompleted(true);
                setTestStarted(false);
                setDebugMsg('הבדיקה הסתיימה');
            } else {
                setDebugMsg(`עבר לתא ${cellNumber + 1}`);
            }
        });

        const handleCellActivation = () => {
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

            if (socket.connected && currentCell < totalCells) {
                console.log('Activating cell:', currentCell);
                socket.emit('activateCell', { cellNumber: currentCell });
            }
        };

        window.activateCell = handleCellActivation;

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('cellUpdate');
            socket.disconnect();
        };
    }, [currentCell, totalCells, testCompleted, testStarted]);

    const getButtonText = () => {
        if (!testStarted) return 'התחל בדיקה';
        if (testCompleted) return 'התחל בדיקה חדשה';
        return `הפעל תא ${currentCell + 1}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
            <NightKingdomLogo size="large" />
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
                onClick={() => window.activateCell()}
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