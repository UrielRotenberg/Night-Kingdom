import React, { useState, useEffect } from 'react';
import { Timer, Radio } from 'lucide-react';
import io from 'socket.io-client';
import prisonBackground from './logo/PrisonBackground.png';
import BackgroundCheck from './logo/BackgroundCheck.png'

const InspectionSystem = () => {
    const [cells, setCells] = useState(Array(12).fill({
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
                wing: '1',
                officer: 'ישראל כהן',
                shift: 'לילה'
            }
        });
    };

    const resetTest = () => {
        setIsTestActive(false);
        setResults(null);
        setCells(Array(12).fill({
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
            <div style={{ 
                width: '100vw',
                height: '100vh',
                backgroundImage: `url(${BackgroundCheck})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '1.5rem',
                    paddingTop: '100px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        color: 'white',
                        direction: 'rtl',
                        maxHeight: 'calc(100vh - 140px)',
                        overflow: 'auto'
                    }}>
                        <h1 style={{
                            fontSize: '2rem',
                            color: '#60A5FA',
                            textAlign: 'center',
                            marginBottom: '2rem'
                        }}>
                            סיכום בדיקת תאים
                        </h1>
    
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '2.5rem', color: '#3B82F6', fontWeight: 'bold' }}>
                                    {results.totalCells}
                                </p>
                                <p>סה״כ תאים</p>
                            </div>
                            <div style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '2.5rem', color: '#22C55E', fontWeight: 'bold' }}>
                                    {results.checkedCells}
                                </p>
                                <p>תאים תקינים</p>
                            </div>
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '2.5rem', color: '#EF4444', fontWeight: 'bold' }}>
                                    {results.failedCells}
                                </p>
                                <p>תאים שנכשלו</p>
                            </div>
                        </div>
    
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '2rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem'
                            }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>מידע כללי</h3>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <p>תאריך: {results.date}</p>
                                    <p>שעה: {results.time}</p>
                                    <p>זמן כולל: {results.totalDuration} שניות</p>
                                    <p>אחוז הצלחה: {results.successRate}%</p>
                                    <p>ציון: {results.grade}</p>
                                </div>
                            </div>
    
                            <div style={{
                                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem'
                            }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>פרטי משמרת</h3>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <p>בית סוהר: {results.shiftInfo.prison}</p>
                                    <p>אגף: {results.shiftInfo.wing}</p>
                                    <p>סוהר: {results.shiftInfo.officer}</p>
                                    <p>משמרת: {results.shiftInfo.shift}</p>
                                </div>
                            </div>
                        </div>
    
                        <div style={{
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            marginBottom: '2rem'
                        }}>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>פירוט התאים</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {results.cellDetails.map(cell => (
                                    <div key={cell.number} style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '1rem',
                                        backgroundColor: cell.status === 'תקין' ? 'rgba(34, 197, 94, 0.1)' :
                                                       cell.status === 'נכשל' ? 'rgba(239, 68, 68, 0.1)' :
                                                       'rgba(100, 116, 139, 0.1)',
                                        padding: '1rem',
                                        borderRadius: '0.5rem'
                                    }}>
                                        <span>תא {cell.number}</span>
                                        <span style={{
                                            color: cell.status === 'תקין' ? '#22C55E' :
                                                   cell.status === 'נכשל' ? '#EF4444' : '#94A3B8'
                                        }}>סטטוס: {cell.status}</span>
                                        <span>זמן בדיקה: {cell.checkTime}</span>
                                        <span>משך: {cell.duration}s</span>
                                    </div>
                                ))}
                            </div>
                        </div>
    
                        <button
                            onClick={resetTest}
                            style={{
                                width: '100%',
                                backgroundColor: '#8B5CF6',
                                color: 'white',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                marginTop: 'auto'
                            }}
                            onMouseEnter={e => e.target.style.backgroundColor = '#7C3AED'}
                            onMouseLeave={e => e.target.style.backgroundColor = '#8B5CF6'}
                        >
                            התחל ביקורת חדשה
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    

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
    const CellBars = () => (
        <svg width="100%" height="100%" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.4,
            pointerEvents: 'none'
        }}>
            {[...Array(6)].map((_, i) => (
                <rect
                    key={`v-${i}`}
                    x={`${(i * 20)}%`}
                    y="0"
                    width="4"
                    height="100%"
                    fill="#94a3b8"
                />
            ))}
            {[...Array(3)].map((_, i) => (
                <rect
                    key={`h-${i}`}
                    x="0"
                    y={`${(i * 40)}%`}
                    width="100%"
                    height="4"
                    fill="#94a3b8"
                />
            ))}
        </svg>
    );
    const CellComponent = ({ cell, index, isActive, socket }) => {
        const handleCellActivation = () => {
            if (isActive) {
                socket.emit('activateCell', { cellNumber: index }); // קודם מפעיל את הפנס
                
                setTimeout(() => {
                    socket.emit('cellUpdate', index); // אחרי שניה מפעיל את החיישן
                }, 1000);
            }
        };
     
        return (
            <div
                onClick={handleCellActivation}
                style={{
                    cursor: isActive ? 'pointer' : 'default',
                    backgroundColor: cell.active ? 'rgba(16, 185, 129, 0.9)' :
                        cell.failed ? 'rgba(239, 68, 68, 0.9)' :
                        isActive ? 'rgba(59, 130, 246, 0.9)' :
                        'rgba(30, 41, 59, 0.9)',
                    padding: '2rem',
                    borderRadius: '0.75rem',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    animation: isActive ? 'pulse 2s infinite' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '180px',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <CellBars />
                
                <Radio 
                    className="relative z-10"
                    size={48}
                    color={
                        cell.active ? '#4ade80' :
                        cell.failed ? '#f87171' :
                        '#94a3b8'
                    }
                />
                
                <h3 style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginTop: '1rem',
                    position: 'relative',
                    zIndex: 1
                }}>תא {index + 1}</h3>
            </div>
        );
     };

    return (
        <div style={{ 
            width: '100vw',
            height: '100vh',
            backgroundImage: `url(${BackgroundCheck})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '1.5rem',
                paddingTop: '120px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    width: 'fit-content',
                    margin: '0 auto 2rem auto',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '1.5rem 3rem',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <Timer size={48} color="white" />
                    <span style={{
                        color: 'white',
                        fontFamily: 'monospace',
                        fontSize: '3rem',
                        fontWeight: 'bold'
                    }}>{elapsedTime.toFixed(1)}s</span>
                </div>
    
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '1.5rem',
                        maxWidth: '1400px',
                        margin: '0 auto'
                    }}>
                        {cells.map((cell, index) => (
                            <CellComponent
                                key={index}
                                cell={cell}
                                index={index}
                                isActive={index === currentCell}
                                socket={socket}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InspectionSystem;