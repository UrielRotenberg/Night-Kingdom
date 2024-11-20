import React, { useState, useEffect, useRef } from 'react';
import { Timer, Radio } from 'lucide-react';

const InspectionSystem = ({ onBack }) => {
  const [stage, setStage] = useState('initial');
  const [hasSpoken, setHasSpoken] = useState(false);
  const [cells, setCells] = useState(Array(6).fill({ 
    active: false, 
    timestamp: null, 
    duration: 0,
    skipped: false,
    failed: false 
  }));
  const [startTime, setStartTime] = useState(null);
  const [currentCell, setCurrentCell] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [results, setResults] = useState(null);
  
  const recognition = useRef(null);
  const cellTimeout = useRef(null);
  const flashlightTimeout = useRef(null);

  const activateFlashlight = async () => {
    if (stage !== 'inspection' || !cells[currentCell]) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = stream.getVideoTracks()[0];
      
      await track.applyConstraints({
        advanced: [{ torch: true }]
      });
      
      setTimeout(async () => {
        await track.applyConstraints({
          advanced: [{ torch: false }]
        });
        stream.getTracks().forEach(track => track.stop());
        
        setCells(prev => {
          const newCells = [...prev];
          newCells[currentCell] = {
            active: true,
            timestamp: Date.now(),
            duration: (Date.now() - startTime) / 1000,
            skipped: false,
            failed: false
          };
          return newCells;
        });
        setCurrentCell(prev => prev + 1);
      }, 2000);
      
    } catch (err) {
      console.error('Flashlight error:', err);
      alert('שגיאה בהפעלת הפנס. נא לוודא שיש הרשאות מתאימות.');
    }
  };

  useEffect(() => {
    if (stage === 'initial' && !hasSpoken) {
      const announcement = new SpeechSynthesisUtterance(
        'ברוך הבא למערכת בדיקת התאים. אנא אמור "התחל בדיקה" כדי להתחיל'
      );
      announcement.lang = 'he-IL';
      window.speechSynthesis.speak(announcement);
      setHasSpoken(true);
      
      if ('webkitSpeechRecognition' in window) {
        recognition.current = new window.webkitSpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = false;
        recognition.current.lang = 'he-IL';

        recognition.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          console.log('Heard:', transcript);
          if (transcript.includes('התחל בדיקה')) {
            startInspection();
          }
        };

        recognition.current.onend = () => {
          if (stage === 'listening') {
            recognition.current.start();
          }
        };

        setStage('listening');
        recognition.current.start();
      }
    }
  }, [stage, hasSpoken]);

  useEffect(() => {
    let timer;
    if (stage === 'inspection') {
      timer = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [stage, startTime]);

  useEffect(() => {
    if (stage === 'inspection' && currentCell < cells.length) {
      cellTimeout.current = setTimeout(() => {
        if (!cells[currentCell].active) {
          setCells(prev => {
            const newCells = [...prev];
            newCells[currentCell] = {
              active: false,
              timestamp: Date.now(),
              duration: 0,
              skipped: false,
              failed: true
            };
            return newCells;
          });
          setCurrentCell(prev => prev + 1);
        }
      }, 7000);

      return () => clearTimeout(cellTimeout.current);
    }

    if (stage === 'inspection' && currentCell >= cells.length) {
      completeInspection();
    }
  }, [currentCell, cells, stage]);

  const startInspection = () => {
    setStage('inspection');
    setStartTime(Date.now());
    if (recognition.current) {
      recognition.current.stop();
    }
  };

  const completeInspection = () => {
    setStage('completed');
    const endTime = Date.now();
    
    const report = {
      date: new Date().toLocaleDateString('he-IL'),
      time: new Date().toLocaleTimeString('he-IL'),
      totalDuration: ((endTime - startTime) / 1000).toFixed(1),
      cells: cells.map((cell, index) => ({
        number: index + 1,
        status: cell.active ? 'תקין' : cell.failed ? 'נכשל' : 'דילוג',
        duration: cell.active ? cell.duration.toFixed(1) : null,
        timestamp: cell.timestamp ? new Date(cell.timestamp).toLocaleTimeString('he-IL') : null
      }))
    };
    
    setResults(report);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {stage === 'listening' && (
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="animate-pulse text-2xl mb-4">מקשיב...</div>
          <div className="text-lg text-gray-400 mb-6">אנא אמור "התחל בדיקה"</div>
          <button
            onClick={startInspection}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg 
                      text-sm transition-all duration-300"
          >
            התחל ללא זיהוי קולי
          </button>
        </div>
      )}

      {stage === 'inspection' && (
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
              <div 
                key={index}
                onClick={() => index === currentCell && activateFlashlight()}
                className={`
                  relative p-6 rounded-lg cursor-pointer
                  ${cell.active ? 'bg-green-700' : 
                    cell.failed ? 'bg-red-700' :
                    cell.skipped ? 'bg-yellow-700' :
                    index === currentCell ? 'bg-blue-700 animate-pulse' : 
                    'bg-gray-700'}
                  ${index === currentCell ? 'border-2 border-white' : ''}
                `}
              >
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-1 bg-gray-800" />
                  <div className="absolute top-0 bottom-0 left-1/4 w-1 bg-gray-800" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gray-800" />
                  <div className="absolute top-0 bottom-0 left-3/4 w-1 bg-gray-800" />
                </div>
                
                <Radio className={`h-12 w-12 ${
                  cell.active ? 'text-green-300' : 
                  cell.failed ? 'text-red-300' :
                  cell.skipped ? 'text-yellow-300' :
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
      )}

      {stage === 'completed' && results && (
        <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">סיכום בדיקה</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>תאריך: {results.date}</div>
              <div>שעה: {results.time}</div>
              <div>משך כולל: {results.totalDuration} שניות</div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3">פירוט תאים:</h3>
              <div className="space-y-2">
                {results.cells.map(cell => (
                  <div key={cell.number} className={`
                    p-3 rounded-lg
                    ${cell.status === 'תקין' ? 'bg-green-800/50' :
                      cell.status === 'דילוג' ? 'bg-yellow-800/50' :
                      'bg-red-800/50'}
                  `}>
                    <div className="flex justify-between items-center">
                      <span>תא {cell.number}</span>
                      <span>{cell.status}</span>
                      {cell.duration && <span>{cell.duration} שניות</span>}
                      {cell.timestamp && <span>{cell.timestamp}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            חזור למסך הראשי
          </button>
        </div>
      )}
    </div>
  );
};

export default InspectionSystem;