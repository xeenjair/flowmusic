import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import MiniPlayer from './components/MiniPlayer';
import './App.css';

const root = createRoot(document.getElementById('root'));
// Мини-плеер — тот же бандл, отдельный рендер по хэшу #mini
if (window.location.hash === '#mini') {
  root.render(<MiniPlayer />);
} else {
  root.render(<App />);
}