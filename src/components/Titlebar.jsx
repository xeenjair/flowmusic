import React, { useState, useEffect } from 'react';
import { NoteIcon } from './icons/Icons';

const platform = window.navigator.platform.toLowerCase();

export default function Titlebar({ onMaximizeChange }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = platform.includes('mac');

  useEffect(() => {
    const checkMaximized = () => {
      const maximized = document.body.classList.contains('window-maximized');
      setIsMaximized(maximized);
      onMaximizeChange?.(maximized);
    };

    // Listen for maximize/restore events from main process
    const handler = () => {
      // Electron doesn't send events, we'll check via IPC periodically
      // or use a mutation observer on body class
    };

    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  const handleMinimize = () => window.electron?.window?.minimize();
  const handleMaximize = () => window.electron?.window?.maximize();
  const handleClose = () => window.electron?.window?.close();

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-left">
          <NoteIcon className="titlebar-icon" size={14} />
          <span className="titlebar-title">FlowMusic</span>
        </div>
        <div className="titlebar-drag-center" />
      </div>
      {!isMac && (
        <div className="titlebar-controls">
          <button className="titlebar-btn titlebar-btn-minimize" onClick={handleMinimize} title="Свернуть">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
            </svg>
          </button>
          <button className="titlebar-btn titlebar-btn-maximize" onClick={handleMaximize} title={isMaximized ? 'Восстановить' : 'Развернуть'}>
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
                <rect x="0.5" y="2.5" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>
          <button className="titlebar-btn titlebar-btn-close" onClick={handleClose} title="Закрыть">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
