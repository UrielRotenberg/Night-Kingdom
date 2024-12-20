import React, { useState, useEffect } from 'react';
import { Timer, Radio } from 'lucide-react';
import io from 'socket.io-client';
import prisonBackground from '../Components/logo/prison-background.jpg';

const InspectionSystem = () => {
    const [cells, setCells] = useState(Array(6).fill({
        active: false,
        timestamp: null,
        duration: 0,
        failed: false,
        skipped: false
    }));
    const [currentCell, setCurrentCell] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [isTestActive, setIsTestActive] = useState(false);
    const [results, setResults] = useState(null);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io('http://172.20.10.4:3001', {
            transports: ['websocket', 'polling']
        });
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    useEffect(() => {
        if (!startTime && isTestActive) {
            setStartTime(Date.now());
        }
    }, [startTime, isTestActive]);

    useEffect(() => {
        let timer;
        if (isTestActive) {
            timer = setInterval(() => {
                setElapsedTime((Date.now() - startTime) / 1000);
            }, 100);
        }
        return () => clearInterval(timer);
    }, [startTime, isTestActive]);

    useEffect(() => {
        if (!socket) return;

        socket.on('activateCell', ({ cellNumber }) => {
            if (cellNumber === currentCell) {
                setCells(prev => {
                    const newCells = [...prev];
                    newCells[currentCell] = {
                        active: true,
                        timestamp: Date.now(),
                        duration: (Date.now() - startTime) / 1000,
                        failed: false,
                        skipped: false
                    };
                    return newCells;
                });

                const nextCell = currentCell + 1;
                setCurrentCell(nextCell);
                socket.emit('cellUpdate', nextCell);
            }
        });

        return () => socket.off('activateCell');
    }, [currentCell, startTime, socket]);

    useEffect(() => {
        let timeout;
        if (isTestActive && currentCell < cells.length && socket) {
            timeout = setTimeout(() => {
                if (!cells[currentCell].active) {
                    setCells(prev => {
                        const newCells = [...prev];
                        newCells[currentCell] = {
                            active: false,
                            timestamp: Date.now(),
                            duration: 0,
                            failed: true,
                            skipped: false
                        };
                        return newCells;
                    });
                    const nextCell = currentCell + 1;
                    setCurrentCell(nextCell);
                    
                    // שליחת אירוע הדילוג
                    socket.emit('cellSkipped', currentCell);
                    socket.emit('cellUpdate', nextCell);
                }
            }, 5000);
        }

        if (currentCell >= cells.length && isTestActive) {
            completeTest();
        }

        return () => clearTimeout(timeout);
    }, [currentCell, cells, isTestActive, socket]);

    const completeTest = () => {
        setIsTestActive(false);
        const endTime = Date.now();

        const failedCells = cells.filter(cell => cell.failed).length;
        const activeCells = cells.filter(cell => cell.active).length;
        const successRate = (activeCells / cells.length) * 100;

        setResults({
            date: new Date().toLocaleDateString('he-IL'),
            time: new Date().toLocaleTimeString('he-IL'),
            totalDuration: ((endTime - startTime) / 1000).toFixed(1),
            totalCells: cells.length,
            checkedCells: activeCells,
            failedCells: failedCells,
            successRate: successRate.toFixed(1),
            cellDetails: cells.map((cell, index) => ({
                number: index + 1,
                status: cell.active ? 'תקין' : cell.failed ? 'נכשל' : 'לא נבדק',
                checkTime: cell.timestamp ? new Date(cell.timestamp).toLocaleTimeString('he-IL') : '-',
                duration: cell.duration ? cell.duration.toFixed(1) : '-',
            })),
            grade: successRate === 100 ? 'מצוין' :
                successRate >= 90 ? 'טוב מאוד' :
                successRate >= 80 ? 'טוב' : 'נכשל',
            shiftInfo: {
                prison: 'מגידו',
                wing: '1 - פח"ע',
                officer: 'ישראל כהן',
                shift: 'לילה'
            }
        });
    };

    const resetTest = () => {
        setIsTestActive(false);
        setResults(null);
        setCells(Array(6).fill({
            active: false,
            timestamp: null,
            duration: 0,
            failed: false,
            skipped: false
        }));
        setCurrentCell(0);
        setElapsedTime(0);
        setStartTime(null);
        socket.emit('cellUpdate', 0);
    };

    if (results) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
                <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8">
                    <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">
                        סיכום בדיקת תאים
                    </h1>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-2">מידע כללי</h3>
                            <p>תאריך: {results.date}</p>
                            <p>שעה: {results.time}</p>
                            <p>זמן כולל: {results.totalDuration} שניות</p>
                            <p>אחוז הצלחה: {results.successRate}%</p>
                            <p>ציון: {results.grade}</p>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-2">פרטי משמרת</h3>
                            <p>בית סוהר: {results.shiftInfo.prison}</p>
                            <p>אגף: {results.shiftInfo.wing}</p>
                            <p>סוהר: {results.shiftInfo.officer}</p>
                            <p>משמרת: {results.shiftInfo.shift}</p>
                        </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4 mb-8">
                        <h3 className="text-lg font-semibold mb-2">סטטיסטיקות</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-3xl font-bold text-blue-400">{results.totalCells}</p>
                                <p>סה״כ תאים</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-green-400">{results.checkedCells}</p>
                                <p>תאים תקינים</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-red-400">{results.failedCells}</p>
                                <p>תאים שנכשלו</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4 mb-8">
                        <h3 className="text-lg font-semibold mb-4">פירוט תאים</h3>
                        <div className="grid gap-3">
                            {results.cellDetails.map(cell => (
                                <div key={cell.number}
                                    className={`p-3 rounded-lg grid grid-cols-4 gap-4 ${
                                        cell.status === 'תקין' ? 'bg-green-800/50' :
                                        cell.status === 'נכשל' ? 'bg-red-800/50' :
                                        'bg-gray-800/50'
                                    }`}
                                >
                                    <div>תא {cell.number}</div>
                                    <div>סטטוס: {cell.status}</div>
                                    <div>שעת בדיקה: {cell.checkTime}</div>
                                    <div>משך בדיקה: {cell.duration} שניות</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={resetTest}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                    >
                        חזור לדף הבית
                    </button>
                </div>
            </div>
        );
    }

    if (!isTestActive) {
        return (
            <div className="h-screen w-full" style={{
                backgroundImage: `url(${prisonBackground})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}>
                <div className="relative h-full w-full">
                    <button
                        onClick={() => setIsTestActive(true)}
                        className="absolute left-[7%] bottom-[8%] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-20 py-7 rounded-[50px] text-2xl font-medium transition-colors shadow-lg shadow-[#8B5CF6]/50 flex flex-col items-center justify-center w-80"
                        style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span>התחל בדיקה</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">בדיקת תאים</h1>
                    <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        <span className="font-mono text-xl">{elapsedTime.toFixed(1)}s</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {cells.map((cell, index) => (
                        <div key={index}
                            className={`
                                relative p-6 rounded-lg
                                ${cell.active ? 'bg-green-700' :
                                cell.failed ? 'bg-red-700' :
                                index === currentCell ? 'bg-blue-700 animate-pulse' :
                                'bg-gray-700'}
                            `}
                        >
                            <Radio className={`h-12 w-12 ${
                                cell.active ? 'text-green-300' :
                                cell.failed ? 'text-red-300' :
                                'text-gray-400'
                            }`} />
                            <div className="mt-2 text-center">
                                <h3 className="text-xl font-bold">תא {index + 1}</h3>
                                {cell.timestamp && (
                                    <p className="text-sm opacity-80">
                                        {new Date(cell.timestamp).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InspectionSystem;