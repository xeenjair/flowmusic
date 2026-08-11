import React, { useState, useEffect, useRef } from 'react';

// Прогресс-бар плеера с собственным 60fps-циклом.
// Время читается напрямую из audio каждый кадр (~16мс), поэтому полоска
// и таймер движутся плавно, а не рывками (timeupdate даёт лишь ~4 тика/сек).
// Рендерится ТОЛЬКО этот блок — App и Discord-статус не затрагиваются.
function PlayerProgress({ getCurrentTime, duration, primaryColor, onSeek }) {
  const [liveTime, setLiveTime] = useState(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    let rafId;
    const tick = () => {
      const t = getCurrentTime ? getCurrentTime() : 0;
      // Обновляем только при заметном изменении (>10мс) — на паузе не спамим рендеры
      if (Math.abs(t - lastTimeRef.current) >= 0.01) {
        lastTimeRef.current = t;
        setLiveTime(t);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [getCurrentTime]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percent = duration > 0 ? Math.min((liveTime / duration) * 100, 100) : 0;

  return (
    <div className="player-progress">
      <span className="player-time">{formatTime(liveTime)}</span>
      <div className="progress-bar" onMouseDown={(e) => {
        const bar = e.currentTarget;
        const doSeek = (clientX) => {
          const rect = bar.getBoundingClientRect();
          const percent2 = (clientX - rect.left) / rect.width;
          const newTime = percent2 * duration;
          if (!isNaN(newTime)) onSeek(newTime);
        };
        doSeek(e.clientX);

        const handleMouseMove = (moveEvent) => doSeek(moveEvent.clientX);
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}>
        <div className="progress-filled" style={{ width: `${percent}%`, background: primaryColor }} />
        <div className="progress-handle" style={{ left: `${percent}%` }} />
      </div>
      <span className="player-time">{formatTime(duration)}</span>
    </div>
  );
}

export default React.memo(PlayerProgress);