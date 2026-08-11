import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PrevIcon, PlayIcon, PauseIcon, NextIcon, AddIcon } from './icons/Icons';
import './LyricsView.css';

// Мемоизированная строка текста: перерендер только при реальном изменении
// (isActive/isPassed/цвет) — при 30fps-таймере не перерисовываются все 100 строк
const LyricLine = React.memo(function LyricLine({ text, isActive, isPassed, highlightColor, secondaryColor }) {
  return (
    <motion.div
      className={`lyrics-line ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
      style={{ color: isActive ? highlightColor : secondaryColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}, (prev, next) =>
  prev.text === next.text &&
  prev.isActive === next.isActive &&
  prev.isPassed === next.isPassed &&
  prev.highlightColor === next.highlightColor &&
  prev.secondaryColor === next.secondaryColor
);

const LyricsView = React.memo(function LyricsView({ track, currentTime, getCurrentTime, duration, volume, onVolumeChange, isPlaying, onPlayPause, onNext, onPrevious, onSeek, isLoading, onClose, settings, t }) {
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [liveTime, setLiveTime] = useState(0);
  const [source, setSource] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hasCustomLyrics, setHasCustomLyrics] = useState(false);
  const lyricsRef = useRef(null);
  const textPanelRef = useRef(null);
  const parsedLyricsRef = useRef([]);
  const lastScrollTimeRef = useRef(0);

  const highlightColor = settings?.lyricsHighlightColor || '#ffdb4d';
  const textColor = settings?.lyricsTextColor || '#ffffff';
  const secondaryColor = settings?.lyricsSecondaryColor || '#888888';

  useEffect(() => {
    if (track) {
      loadLyrics();
      checkCustomLyrics();
    } else {
      setLyrics(null);
      parsedLyricsRef.current = [];
      setActiveLineIndex(-1);
      setHasCustomLyrics(false);
    }
  }, [track]);

  // 60fps-цикл: время читается напрямую из audio каждый кадр (~16мс),
  // отсекается только дубликат значения (обычно при паузе/загрузке)
  useEffect(() => {
    let rafId;
    let lastTime = -1;
    const tick = () => {
      const t = getCurrentTime ? getCurrentTime() : (currentTime || 0);
      if (Math.abs(t - lastTime) >= 0.01) {
        lastTime = t;
        setLiveTime(t);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [getCurrentTime, currentTime]);

  useEffect(() => {
    if (parsedLyricsRef.current.length === 0) return;
    
    const idx = parsedLyricsRef.current.findIndex(line => 
      liveTime >= line.startTime && liveTime <= line.endTime
    );
    
    if (idx !== -1 && idx !== activeLineIndex) {
      setActiveLineIndex(idx);
    }
    
    const now = Date.now();
    if (idx !== -1 && lyricsRef.current && textPanelRef.current && (now - lastScrollTimeRef.current > 300)) {
      const panel = textPanelRef.current;
      const lineElement = lyricsRef.current.children[idx];
      if (lineElement) {
        // Плавный скролл ТОЛЬКО панели текста (не всех контейнеров)
        const panelRect = panel.getBoundingClientRect();
        const lineRect = lineElement.getBoundingClientRect();
        const lineCenterInPanel = lineRect.top - panelRect.top + lineRect.height / 2;
        const centerOffset = lineCenterInPanel - panel.clientHeight / 2;
        // Не скроллим, если строка и так почти по центру (защита от дёрганий)
        if (Math.abs(centerOffset) > 40) {
          panel.scrollTo({ top: panel.scrollTop + centerOffset, behavior: 'smooth' });
        }
        lastScrollTimeRef.current = now;
      }
    }
  }, [liveTime, activeLineIndex]);

  const checkCustomLyrics = async () => {
    if (!track) return;
    try {
      const custom = await window.electron.lyrics.getCustom(track.id);
      setHasCustomLyrics(!!custom);
    } catch (err) {
      console.error('Check custom error:', err);
    }
  };

  const parseSyncedLyrics = (lyricsText) => {
    const lines = lyricsText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(timeRegex);
      
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        let milliseconds = parseInt(match[3], 10);
        // Если миллисекунды двухзначные, умножаем на 10
        if (match[3].length === 2) milliseconds *= 10;
        
        const startTime = minutes * 60 + seconds + milliseconds / 1000;
        const text = line.replace(timeRegex, '').trim();
        
        if (text) {
          let endTime = startTime + 5;
          for (let j = i + 1; j < lines.length; j++) {
            const nextMatch = lines[j].match(timeRegex);
            if (nextMatch) {
              const nextMinutes = parseInt(nextMatch[1], 10);
              const nextSeconds = parseInt(nextMatch[2], 10);
              let nextMs = parseInt(nextMatch[3], 10);
              if (nextMatch[3].length === 2) nextMs *= 10;
              endTime = nextMinutes * 60 + nextSeconds + nextMs / 1000;
              break;
            }
          }
          parsed.push({ text, startTime, endTime });
        }
      }
    }
    
    console.log('Parsed lyrics:', parsed.length, 'lines');
    return parsed;
  };

  const loadLyrics = async () => {
    setLoading(true);
    setError(null);
    setLyrics(null);
    setSource(null);
    parsedLyricsRef.current = [];
    setActiveLineIndex(-1);
    
    try {
      const result = await window.electron.lyrics.get(
        track.id,
        track.title,
        track.artists,
        track.album,
        track.duration
      );
      
      if (result) {
        setLyrics(result);
        
        if (result.fromCustom) {
          setSource('custom');
          const parsed = parseSyncedLyrics(result.plain);
          if (parsed.length > 0) {
            parsedLyricsRef.current = parsed;
          }
        } else {
          setSource(result.source || (result.fromCache ? 'cache' : 'unknown'));
          if (result.synced) {
            parsedLyricsRef.current = parseSyncedLyrics(result.synced);
          }
        }
      } else {
        setError(t ? t('main_no_lyrics') : 'Текст не найден');
      }
    } catch (err) {
      console.error('Lyrics load error:', err);
      setError('Ошибка загрузки текста');
    } finally {
      setLoading(false);
    }
  };

  const formatPlainLyrics = (text) => text.split('\n').filter(line => line.trim());

  const getSourceText = () => {
    if (source === 'custom') return 'Мой текст';
    if (source === 'yandex') return 'Яндекс.Музыка';
    if (source === 'lrclib') return 'LRCLIB';
    if (source === 'genius') return 'Genius';
    if (source === 'textovoi') return 'Textovoi';
    if (source === 'megalyrics') return 'Megalyrics';
    if (source === 'cache') return 'Кэш';
    return '';
  };

  const saveCustomLyrics = async () => {
    if (!track || !customText.trim()) return;
    try {
      await window.electron.lyrics.saveCustom(track.id, customText);
      setHasCustomLyrics(true);
      setIsEditing(false);
      loadLyrics();
    } catch (err) {
      console.error('Save custom error:', err);
      alert('Ошибка сохранения');
    }
  };

  const deleteCustomLyrics = async () => {
    if (!track) return;
    try {
      await window.electron.lyrics.deleteCustom(track.id);
      setHasCustomLyrics(false);
      loadLyrics();
    } catch (err) {
      console.error('Delete custom error:', err);
    }
  };

  const startEditing = () => {
    setCustomText(lyrics?.plain || '');
    setIsEditing(true);
  };

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) {
    return (
      <div className="lyrics-fullscreen">
        <button className="lyrics-close-btn" onClick={onClose}><PrevIcon size={16} /> Назад</button>
        <div className="lyrics-centered-container">
          <div className="empty-cover-placeholder centered">
            <span className="cover-icon">🎵</span>
            <p>Выберите трек</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lyrics-fullscreen">
        <button className="lyrics-close-btn" onClick={onClose}><PrevIcon size={16} /> Назад</button>
        <div className="lyrics-centered-container">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="lyrics-fullscreen">
        <button className="lyrics-close-btn" onClick={onClose}><PrevIcon size={16} /> Назад</button>
        <div className="lyrics-editor-container">
          <h3>Редактирование текста</h3>
          <p className="editor-track-info">{track.title} — {track.artists}</p>
          <p className="editor-hint">
            💡 Для синхронизации: <code>[00:00.00] Текст строки</code>
          </p>
          <textarea 
            className="lyrics-textarea"
            value={customText} 
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="[00:00.00] Строка с таймкодом&#10;[00:05.00] Следующая строка&#10;или обычный текст"
            autoFocus
          />
          <div className="editor-actions">
            <button className="editor-btn save" onClick={saveCustomLyrics}>💾 Сохранить</button>
            <button className="editor-btn cancel" onClick={() => setIsEditing(false)}>Отмена</button>
          </div>
        </div>
      </div>
    );
  }

  if (parsedLyricsRef.current.length > 0 || lyrics?.plain) {
    return (
      <div className="lyrics-fullscreen">
        <button className="lyrics-close-btn" onClick={onClose}><PrevIcon size={16} /> Назад</button>
        <div className="lyrics-split-container">
          <div className="lyrics-cover-panel">
            <motion.div 
              className="lyrics-cover-wrapper"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {track.cover ? (
                <>
                  <img src={track.cover} alt={track.title} className="fixed-cover-left" />
                  <div className="lyrics-cover-overlay" />
                </>
              ) : (
                <div className="empty-cover-placeholder">
                  <span className="cover-icon">🎧</span>
                </div>
              )}
              
              {showControls && (
                <motion.div
                  className="lyrics-cover-controls"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button className="cover-control-btn" onClick={onPrevious}>
                    <PrevIcon size={20} />
                  </button>
                  <button className="cover-control-btn play" onClick={onPlayPause}>
                    {isLoading ? '⏳' : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                  </button>
                  <button className="cover-control-btn" onClick={onNext}>
                    <NextIcon size={20} />
                  </button>
                </motion.div>
              )}
            </motion.div>
            <div className="cover-info-left">
              <h3 style={{ color: textColor }}>{track.title}</h3>
              <p style={{ color: secondaryColor }}>{track.artists}</p>

               <div className="lyrics-cover-bottom-controls">
                  <div className="lyrics-progress-container">
                    <span className="lyrics-current-time">{formatTime(liveTime)}</span>
                    <div
                      className="lyrics-progress-bar"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const newTime = percent * (duration || 0);
                        window.dispatchEvent(new CustomEvent('lyrics:seek', { detail: newTime }));
                      }}
                    >
                      <div
                        className="lyrics-progress-filled"
                        style={{ width: duration > 0 ? `${(liveTime / duration) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="lyrics-duration-time">{formatTime(duration)}</span>
                  </div>

                  <div className="lyrics-volume-block">
                  <span className="lyrics-volume-label">Громкость</span>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.001"
                     value={volume ?? 0.7}
                     onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                     className="lyrics-volume-slider"
                   />
                </div>
              </div>
            </div>
          </div>

          <div className="lyrics-text-panel" ref={textPanelRef} style={{ '--cover-bg': track.cover ? `url(${track.cover})` : 'none' }}>
            <div className="lyrics-actions">
              {source && <span className="lyrics-source-badge">{getSourceText()}</span>}
              <button className="lyrics-edit-btn" onClick={startEditing}>
                {hasCustomLyrics ? '✏️' : '➕'}
              </button>
              {hasCustomLyrics && (
                <button className="lyrics-delete-btn" onClick={deleteCustomLyrics}>🗑️</button>
              )}
            </div>
            <div ref={lyricsRef}>
              {parsedLyricsRef.current.length > 0 ? (
                parsedLyricsRef.current.map((line, index) => (
                  <LyricLine
                    key={index}
                    text={line.text}
                    isActive={index === activeLineIndex}
                    isPassed={index < activeLineIndex}
                    highlightColor={highlightColor}
                    secondaryColor={secondaryColor}
                  />
                ))
              ) : (
                formatPlainLyrics(lyrics.plain).map((line, index) => (
                  <motion.div 
                    key={index} 
                    className="lyrics-line-plain"
                    style={{ color: textColor }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {line}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lyrics-fullscreen">
      <button className="lyrics-close-btn" onClick={onClose}>← Назад</button>
        <div className="lyrics-centered-container">
        <motion.div
          className="lyrics-cover-wrapper centered-cover-wrapper"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {track.cover ? (
            <>
              <img src={track.cover} alt={track.title} className="centered-cover-large" />
              <div className="lyrics-cover-overlay centered-overlay" />
            </>
          ) : (
            <div className="empty-cover-placeholder centered">
              <span className="cover-icon">🎧</span>
              <p>{track.title}</p>
              <p className="cover-artist">{track.artists}</p>
            </div>
          )}

          {showControls && (
            <motion.div
              className="lyrics-cover-controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button className="cover-control-btn" onClick={onPrevious}>
                <PrevIcon size={20} />
              </button>
              <button className="cover-control-btn play" onClick={onPlayPause}>
                {isLoading ? '⏳' : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
              </button>
              <button className="cover-control-btn" onClick={onNext}>
                <NextIcon size={20} />
              </button>
            </motion.div>
          )}
        </motion.div>
        <div className="lyrics-actions centered-actions above-cover">
          {source && <span className="lyrics-source-badge">{getSourceText()}</span>}
          <button className="lyrics-edit-btn" onClick={startEditing}>
            {hasCustomLyrics ? '✏️' : '➕'}
          </button>
          {hasCustomLyrics && (
            <button className="lyrics-delete-btn" onClick={deleteCustomLyrics}>🗑️</button>
          )}
        </div>
        <div className="cover-info-centered">
          <h2 style={{ color: textColor }}>{track.title}</h2>
          <p style={{ color: secondaryColor }}>{track.artists}</p>

          <div className="lyrics-cover-bottom-controls centered-controls">
            <div className="lyrics-progress-container">
              <span className="lyrics-current-time">{formatTime(liveTime)}</span>
              <div
                className="lyrics-progress-bar"
                onClick={(e) => {
                  if (onSeek) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    const newTime = percent * (duration || track.durationMs / 1000);
                    onSeek(newTime);
                  }
                }}
              >
                <div
                  className="lyrics-progress-filled"
                  style={{ width: duration > 0 ? `${(liveTime / duration) * 100}%` : '0%' }}
                ></div>
              </div>
              <span className="lyrics-duration-time">{formatTime(duration || track.durationMs / 1000)}</span>
            </div>

            <div className="lyrics-volume-block">
              <div className="lyrics-volume-header">
                <span className="lyrics-volume-label">Громкость</span>
                <span className="lyrics-volume-percent">{Math.round((volume ?? 0.7) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume ?? 0.7}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="lyrics-volume-slider"
              />
            </div>
          </div>
        </div>
        <p className="no-lyrics-text">{error || (t ? t('main_no_lyrics') : 'Текст не найден')}</p>
        <button className="add-lyrics-btn" onClick={startEditing}>
          <AddIcon size={16} /> Добавить текст
        </button>
      </div>
    </div>
  );
});

export default LyricsView;