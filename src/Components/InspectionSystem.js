import React, { useState, useEffect, useRef } from 'react';
import { Timer, Radio } from 'lucide-react';
import io from 'socket.io-client';
import PrisonReportPDF from './PrisonReportPDF';
import prisonBackground from './logo/PrisonBackground.png';
import BackgroundCheck from './logo/BackgroundCheck.png';

const InspectionSystem = ({ onResults }) => {
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

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const lightCheckIntervalRef = useRef(null);
    const checkingRef = useRef(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const newSocket = io('http://172.20.10.2:3001', {
            transports: ['websocket', 'polling']
        });
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
            cleanupResources();
        };
    }, []);

    const cleanupResources = () => {
        if (lightCheckIntervalRef.current) {
            clearInterval(lightCheckIntervalRef.current);
            lightCheckIntervalRef.current = null;
        }
        stopCamera();
        checkingRef.current = false;
    };

    const stopCamera = () => {
        try {
            const stream = videoRef.current?.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        } catch (error) {
            console.error("Error stopping camera:", error);
        }
    };

    const calculateBrightness = (data) => {
        try {
            let totalBrightness = 0;
            let samples = 0;

            for (let i = 0; i < data.length; i += 40) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                totalBrightness += (r + g + b) / 3;
                samples++;
            }

            return totalBrightness / samples;
        } catch (error) {
            console.error("Error in calculateBrightness:", error);
            return 0;
        }
    };

    const startLightCheck = () => {
        if (!isTestActive || !videoRef.current || !canvasRef.current) return;
    
        try {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            const brightness = calculateBrightness(imageData.data);
            console.log(`Cell ${currentCell + 1} brightness:`, brightness);
    
            if (brightness > 200) {
                // מעדכנים את התא הנוכחי
                setCells(prev => {
                    const newCells = [...prev];
                    // רק אם התא עדיין לא נבדק
                    if (!newCells[currentCell].active && !newCells[currentCell].failed) {
                        newCells[currentCell] = {
                            active: true,
                            timestamp: Date.now(),
                            duration: (Date.now() - startTime) / 1000,
                            failed: false,
                            skipped: false
                        };
    
                        // מבטלים את הטיימר של הכישלון האוטומטי
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
    
                        // עוברים לתא הבא רק אם התא הנוכחי הצליח
                        setTimeout(() => {
                            setCurrentCell(currentCell + 1);
                            if (socket) {
                                socket.emit('cellUpdate', currentCell + 1);
                            }
                        }, 500);
                    }
                    return newCells;
                });
            } else {
                // ממשיכים לבדוק רק אם התא הנוכחי עדיין לא נבדק
                if (!cells[currentCell].active && !cells[currentCell].failed) {
                    requestAnimationFrame(startLightCheck);
                }
            }
        } catch (error) {
            console.error("Error in startLightCheck:", error);
            handleError();
        }
    };
    
    useEffect(() => {
        if (isTestActive) {
            if (currentCell >= cells.length) {
                completeTest();
                return;
            }
    
            // רק אם התא לא נבדק עדיין, נתחיל טיימר חדש
            if (!cells[currentCell].active && !cells[currentCell].failed) {
                console.log(`Starting check for cell ${currentCell + 1}`);
                
                timeoutRef.current = setTimeout(() => {
                    if (isTestActive) {
                        console.log(`Timeout for cell ${currentCell + 1}`);
                        setCells(prev => {
                            const newCells = [...prev];
                            if (!newCells[currentCell].active && !newCells[currentCell].failed) {
                                newCells[currentCell] = {
                                    active: false,
                                    timestamp: Date.now(),
                                    duration: 0,
                                    failed: true,
                                    skipped: false
                                };
                            }
                            return newCells;
                        });
                        // עוברים לתא הבא רק אם התא הנוכחי נכשל
                        setCurrentCell(currentCell + 1);
                    }
                }, 4000);
    
                startLightCheck();
            }
        }
    
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [currentCell, isTestActive]);
    
    const handleError = () => {
        cleanupResources();
        setIsTestActive(false);
        alert("אירעה שגיאה במהלך הבדיקה");
    };

    useEffect(() => {
        let timer;
        if (isTestActive && startTime) {
            timer = setInterval(() => {
                setElapsedTime((Date.now() - startTime) / 1000);
            }, 100);
        }
        return () => clearInterval(timer);
    }, [startTime, isTestActive]);

    useEffect(() => {
        return () => {
            if (lightCheckIntervalRef.current) {
                clearInterval(lightCheckIntervalRef.current);
            }
        };
    }, []);

    const completeTest = () => {
        setIsTestActive(false);
        const endTime = Date.now();

        const failedCells = cells.filter(cell => cell.failed).length;
        const activeCells = cells.filter(cell => cell.active).length;
        const successRate = (activeCells / cells.length) * 100;

        const startTimeString = new Date(startTime).toLocaleTimeString('he-IL');
        const endTimeString = new Date(endTime).toLocaleTimeString('he-IL');

        const testResults = {
            date: new Date().toLocaleDateString('he-IL'),
            time: startTimeString,
            endTime: endTimeString,
            totalDuration: ((endTime - startTime) / 1000).toFixed(1),
            totalCells: cells.length,
            checkedCells: activeCells,
            failedCells: failedCells,
            successRate: successRate.toFixed(1),
            cellDetails: cells.map((cell, index) => ({
                number: index + 1,
                status: cell.active ? 'נבדק' : cell.failed ? 'לא נבדק' : 'חיישן לא עובד',
                checkTime: cell.timestamp ? new Date(cell.timestamp).toLocaleTimeString('he-IL') : '-',
                duration: cell.duration ? cell.duration.toFixed(1) : '-',
            })),
            grade: successRate === 100 ? 'מצוין' :
                successRate >= 90 ? 'טוב' :
                    'נכשל',
            gradeColor: successRate === 100 ? 'bg-green-400' :
                successRate >= 90 ? 'bg-orange-400' :
                    'bg-red-400',
            shiftInfo: {
                prison: 'מגידו',
                wing: '1',
                officer: 'ישראל כהן',
                shift: 'לילה'
            }
        };

        setResults(testResults);
        cleanupResources();
    };

    const resetTest = () => {
        if (onResults) {
            onResults(null);
        }
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
        cleanupResources();
        if (socket) {
            socket.emit('cellUpdate', 0);
        }
    };

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

    const CellComponent = ({ cell, index, isActive }) => {
        return (
            <div
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
                <div>
                    <div className="absolute inset-0 bg-black/30 py-4 sm:py-8 px-2 sm:px-4">
                        <div className="container mx-auto">
                            <div className="p-0 mt-8 sm:mt-16 mb-12 sm:mb-20">
                                <div className="w-full flex justify-center pt-12 pb-4 col-span-2">
                                    <h2 className="text-2xl sm:text-4xl font-bold text-white">דוח סיכום ביקורת</h2>
                                </div>

                                <table className="w-full border-collapse">
                                    <tbody>
                                        <tr>
                                            <td colSpan="2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    <h2 className="text-xl sm:text-2xl font-bold text-center text-white">מידע כללי</h2>
                                                    <h2 className="text-xl sm:text-2xl font-bold text-center text-white">פרטי משמרת</h2>
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td className="p-0">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="p-2 sm:p-3 rounded-lg"
                                                        style={{
                                                            background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                            borderRadius: '1.25rem'
                                                        }}>
                                                        <table className="w-full" dir="rtl">
                                                            <tbody className="space-y-1">
                                                                <tr>
                                                                    <td className="flex justify-center">
                                                                        <div className="flex flex-col text-sm sm:text-base text-white">
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">תאריך</span>
                                                                                <span>:</span>
                                                                                <span>{results.date}</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">שעת התחלת בדיקה</span>
                                                                                <span>:</span>
                                                                                <span>{results.time}</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">שעת סיום בדיקה</span>
                                                                                <span>:</span>
                                                                                <span>{results.endTime}</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">זמן כולל</span>
                                                                                <span>:</span>
                                                                                <span>{results.totalDuration} שניות</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">אחוז הצלחה</span>
                                                                                <span>:</span>
                                                                                <span>{results.successRate}%</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">ציון</span>
                                                                                <span>:</span>
                                                                                <span>{results.grade}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="p-2 sm:p-3 rounded-lg"
                                                        style={{
                                                            background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                            borderRadius: '1.25rem'
                                                        }}>
                                                        <table className="w-full" dir="rtl">
                                                            <tbody>
                                                                <tr>
                                                                    <td className="flex justify-center">
                                                                        <div className="flex flex-col text-sm sm:text-base text-white">
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">בית סוהר</span>
                                                                                <span>:</span>
                                                                                <span>מגידו</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">אגף</span>
                                                                                <span>:</span>
                                                                                <span>1</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">סוהר</span>
                                                                                <span>:</span>
                                                                                <span>ישראל כהן</span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <span className="font-medium">משמרת</span>
                                                                                <span>:</span>
                                                                                <span>לילה</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td colSpan="2" className="pt-4 pb-2">
                                                <h2 className="text-xl sm:text-2xl font-bold text-center text-white">סיכום תאים</h2>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td className="p-0">
                                                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                                                    <div className="p-2 rounded-lg"
                                                        style={{
                                                            background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                            borderRadius: '1.25rem'
                                                        }}>
                                                        <p className="text-lg sm:text-xl text-red-400 font-bold">{results.failedCells}</p>
                                                        <p className="text-sm sm:text-base text-white">תאים שלא נבדקו</p>
                                                    </div>
                                                    <div className="p-2 rounded-lg"
                                                        style={{
                                                            background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                            borderRadius: '1.25rem'
                                                        }}>
                                                        <p className="text-lg sm:text-xl text-green-400 font-bold">{results.checkedCells}</p>
                                                        <p className="text-sm sm:text-base text-white">תאים שנבדקו</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td colSpan="2" className="pt-4 pb-2">
                                                <h2 className="text-xl sm:text-2xl font-bold text-center text-white">פירוט תאים</h2>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td className="p-0">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                    <div className="space-y-1">
                                                        {[7, 8, 9, 10, 11, 12].map((number) => {
                                                            const cell = results.cellDetails[number - 1];
                                                            return (
                                                                <div key={cell.number}
                                                                    className="p-1 rounded-lg relative overflow-hidden h-8"
                                                                    style={{
                                                                        background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                                        borderRadius: '1.25rem'
                                                                    }}>
                                                                    <div className={`w-1 ${cell.status === 'נבדק' ? 'bg-green-400' : 'bg-red-400'} h-4/5 absolute right-3 top-1/2 -translate-y-1/2 rounded-full`}></div>
                                                                    <div className="pr-6 pl-2 flex justify-between items-center h-full" dir="rtl">
                                                                        <div className="font-medium text-sm sm:text-base text-white">תא {cell.number}</div>
                                                                        {cell.status === 'נבדק' && <div className="text-xs sm:text-sm text-white">{cell.duration} שניות</div>}
                                                                        <div className={`${cell.status === 'נבדק' ? 'text-green-400' : 'text-red-400'} text-sm sm:text-base font-medium`}>
                                                                            {cell.status}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {[1, 2, 3, 4, 5, 6].map((number) => {
                                                            const cell = results.cellDetails[number - 1];
                                                            return (
                                                                <div key={cell.number}
                                                                    className="p-1 rounded-lg relative overflow-hidden h-8"
                                                                    style={{
                                                                        background: 'linear-gradient(141deg, rgba(61, 78, 107, 0.5) 0%, rgba(106, 109, 115, 0.5) 100%)',
                                                                        borderRadius: '1.25rem'
                                                                    }}>
                                                                    <div className={`w-1 ${cell.status === 'נבדק' ? 'bg-green-400' : 'bg-red-400'} h-4/5 absolute right-3 top-1/2 -translate-y-1/2 rounded-full`}></div>
                                                                    <div className="pr-6 pl-2 flex justify-between items-center h-full" dir="rtl">
                                                                        <div className="font-medium text-sm sm:text-base text-white">תא {cell.number}</div>
                                                                        {cell.status === 'נבדק' && <div className="text-xs sm:text-sm text-white">{cell.duration} שניות</div>}
                                                                        <div className={`${cell.status === 'נבדק' ? 'text-green-400' : 'text-red-400'} text-sm sm:text-base font-medium`}>
                                                                            {cell.status}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <button
                                    onClick={resetTest}
                                    className="absolute left-3 sm:left-8 bottom-4 sm:bottom-8 bg-violet-500 hover:bg-violet-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base font-medium transition-colors shadow-lg shadow-violet-500/50 flex flex-col items-center justify-center w-32 sm:w-44"
                                    style={{
                                        textShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.2)'
                                    }}
                                >
                                    התחל ביקורת חדשה
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {results && <PrisonReportPDF results={results} />}
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
                        onClick={async () => {
                            setIsTestActive(true); // קודם נשנה את הסטייט
                            setStartTime(Date.now());
                            
                            try {
                                const stream = await navigator.mediaDevices.getUserMedia({
                                    video: { 
                                        facingMode: "environment",
                                        width: { ideal: 640 },
                                        height: { ideal: 480 }
                                    }
                                });
                                
                                videoRef.current.srcObject = stream;
                                videoRef.current.play()
                                    .then(() => {
                                        startLightCheck();
                                    })
                                    .catch(error => {
                                        console.error("Error playing video:", error);
                                        stopCamera();
                                    });
                            } catch (error) {
                                console.error("Error accessing camera:", error);
                            }
                        }}
                        className="absolute left-[7%] bottom-[8%] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-20 py-7 rounded-[50px] text-2xl font-medium transition-colors shadow-lg shadow-[#8B5CF6]/50 flex flex-col items-center justify-center w-80"
                        style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span>התחל ביקורת</span>
                    </button>
                </div>
            </div>
        );
    }

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
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                playsInline
            />
            <canvas
                ref={canvasRef}
                width="640"
                height="480"
                style={{ display: 'none' }}
            />

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