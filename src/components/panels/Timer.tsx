import React, { useState, useEffect } from 'react';
const TEST_CYCLE_CONFIG = {
  FAULT_DETECTION_START: 5,
  REPAIR_COMPLETE_START: 15,
  TEST_COMPLETE_TIME: 25,
};
import './Timer.css';

interface TimerProps {
  onPhaseChange: (phase: string) => void;
}

const Timer: React.FC<TimerProps> = ({ onPhaseChange }) => {
  const [elapsedSeconds, setElapsedSecondsState] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSecondsState(prev => {
          const newTime = prev + 0.1;
          
          // Notify parent component of phase changes
          if (prev < TEST_CYCLE_CONFIG.FAULT_DETECTION_START && newTime >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START) {
            onPhaseChange('fault_start');
          } else if (prev < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START && newTime >= TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START) {
            onPhaseChange('repair');
          } else if (newTime >= TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME) {
            onPhaseChange('reset');
            return 0; // Reset timer
          }
          
          return newTime;
        });
      }, 100); // Update every 100ms for smooth timer
    }
    return () => clearInterval(interval);
  }, [isRunning, onPhaseChange]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep timer within viewport bounds
    const maxX = window.innerWidth - 320; // timer width
    const maxY = window.innerHeight - 200; // approximate timer height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const getPhase = (): string => {
    if (elapsedSeconds < TEST_CYCLE_CONFIG.FAULT_DETECTION_START) return 'Normal Operation';
    if (elapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START) return 'Fault Detected';
    if (elapsedSeconds < TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME) return 'Repair Started';
    return 'Repair Completed';
  };

  const getPhaseColor = (): string => {
    if (elapsedSeconds < TEST_CYCLE_CONFIG.FAULT_DETECTION_START) return '#27ae60'; // Green - Normal Operation
    if (elapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START) return '#e74c3c'; // Red - Fault Detected
    if (elapsedSeconds < TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME) return '#f39c12'; // Orange - Repair Started
    return '#27ae60'; // Green - Repair Completed
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const resetTimer = () => {
    setElapsedSecondsState(0);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  return (
    <div 
      className={`timer-container ${isDragging ? 'dragging' : ''}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="timer-header">
        <div className="drag-handle">
          <div className="drag-dots">⋮⋮</div>
        </div>
        <h3>Solar Panel Test Timer</h3>
        <div className="timer-controls">
          <button onClick={toggleTimer} className="timer-btn">
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button onClick={resetTimer} className="timer-btn reset">
            Reset
          </button>
        </div>
      </div>
      
      <div className="timer-display">
        <div className="timer-time">{formatTime(elapsedSeconds)}</div>
        <div className="timer-phase" style={{ color: getPhaseColor() }}>
          {getPhase()}
        </div>
      </div>
      
      <div className="timer-progress">
        <div 
          className="timer-bar" 
          style={{ 
            width: `${(elapsedSeconds / TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME) * 100}%`,
            backgroundColor: getPhaseColor()
          }}
        ></div>
      </div>
      
      <div className="timer-events">
        <div className={`event ${elapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && elapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START ? 'active' : ''}`}>
          <span className="event-time">{TEST_CYCLE_CONFIG.FAULT_DETECTION_START}.0s</span>
          <span className="event-desc">
            {elapsedSeconds >= TEST_CYCLE_CONFIG.FAULT_DETECTION_START && elapsedSeconds < TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START 
              ? 'Fault Occurs (P15 fails)' 
              : 'Fault Detected'}
          </span>
        </div>
        
        <div className={`event ${elapsedSeconds >= TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START && elapsedSeconds < TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME ? 'active' : ''}`}>
          <span className="event-time">{TEST_CYCLE_CONFIG.REPAIR_COMPLETE_START}.0s</span>
          <span className="event-desc">Repair Started</span>
        </div>
        
        <div className={`event ${elapsedSeconds >= TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME ? 'active' : ''}`}>
          <span className="event-time">{TEST_CYCLE_CONFIG.TEST_COMPLETE_TIME}.0s</span>
          <span className="event-desc">Repair Completed</span>
        </div>
      </div>
    </div>
  );
};

export default Timer;