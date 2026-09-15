import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PrevIcon, PlayIcon, PauseIcon, NextIcon, AddIcon } from '../icons/Icons';
import './ScrollExpandLyrics.css';

/**
 * Апскейл обложки до максимального разрешения.
 * Яндекс отдаёт uri-шаблон (в main-процессе подставляется 200x200) —
 * меняем сегмент размера на m1000x1000. SoundCloud: -large -> -t500x500.
 * Локальные file:// не трогаем (там и так оригинал).
 */
const hdCover = (url) => {
  if (!url || typeof url !== 'string' || url.startsWith('file:')) return url;
  if (url.includes('sndcdn.com')) return url.replace(/-large(\.\w+)(\?.*)?$/, '-t500x500$1$2');
  return url.replace(/\/m?\d+x\d+/, '/m1000x1000');
};

const formatTime = (s) => {
  if (!s || Number.isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

/**
 * Предблюр фона: жмём обложку в крошечный canvas (56px) и кладём dataURL.
 * Апскейл такой картинки уже сам по себе гладкий — тяжёлый живой
 * CSS-blur(48px) на весь экран больше не нужен, фон не перерастеризуется.
 * При CORS-фейле/файлах вернёт null -> отрисуется старый путь с CSS-блюром.
 */
function useBlurredBg(src) {
  const [bg, setBg] = useState(null);
  useEffect(() => {
    if (!src || src.startsWith('file:')) { setBg(null); return; }
    let dead = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const S = 56;
        const scale = Math.max(S / img.naturalWidth, S / img.naturalHeight);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', 0.8);
        if (!dead) setBg(url);
      } catch (e) {
        if (!dead) setBg(null);
      }
    };
    img.onerror = () => { if (!dead) setBg(null); };
    img.src = src;
    return () => { dead = true; img.src = ''; };
  }, [src]);
  return bg;
}

/**
 * HERO вынесен в memo: при тиках прогресса перерисовывается только он
 * (там инлайн width/height), строки и остальное не трогаем.
 * Все пропсы — примитивы, чтобы memo реально срабатывал.
 */
const HeroView = React.memo(function HeroView({
  w, h, tx, cover, title, artists, hintText, hintOpacity,
}) {
  const first = title.split(' ')[0];
  const rest = title.split(' ').slice(1).join(' ');
  return (
    <section className="sel-hero">
      <div className="sel-card" style={{ width: `${w}px`, height: `${h}px` }}>
        {cover
          ? <img src={cover} alt={title} className="sel-card-img" draggable={false} decoding="async" />
          : (
            <div className="sel-card-ph">
              <span>🎧</span>
            </div>
          )}
      </div>

      <div className="sel-hints">
        {artists && (
          <p className="sel-hint" style={{ transform: `translateX(-${tx}vw)` }}>
            {artists}
          </p>
        )}
        {hintText && (
          <div className="sel-scroll-hint" style={{ opacity: hintOpacity }}>
            <span className="sel-scroll-hint-text">{hintText}</span>
            <span className="sel-chev" />
          </div>
        )}
      </div>

      <div className="sel-titles">
        <h2 className="sel-title" style={{ transform: `translateX(-${tx}vw)` }}>{first}</h2>
        <h2 className="sel-title" style={{ transform: `translateX(${tx}vw)` }}>{rest}</h2>
      </div>
    </section>
  );
});

/** Строки тоже в memo: прогресс колеса и таймер их не перерисовывают. */
const LinesList = React.memo(function LinesList({ lines, activeIndex, highlightColor, onLineSeek }) {
  return (
    <div className="sel-lines">
      {lines.map((line, i) => (
        <button
          key={i}
          id={`sel-line-${i}`}
          className={`sel-line ${i === activeIndex ? 'is-active' : ''} ${i < activeIndex ? 'is-passed' : ''}`}
          style={i === activeIndex ? { color: highlightColor } : undefined}
          onClick={() => onLineSeek(line.startTime)}
        >
          {line.text}
        </button>
      ))}
    </div>
  );
});

/**
 * ScrollExpandLyrics — как на сайте 21st.dev scroll-expansion-hero,
 * только вместо демо-картинки — обложка текущего трека, а вместо
 * демо-текста — настоящий синхронный текст песни.
 *
 * Механика 1:1 с оригиналом:
 * - колесо/тач НЕ скроллят, а раздвигают карточку:
 *   300x400 -> на весь экран (формулы те же: +1250/+400, на мобиле +650/+200)
 * - фон гаснет (opacity 1 - progress), заголовок разъезжается (translateX)
 * - progress >= 1 -> режим раскрыт, скролл отпускается, виден текст
 * - колесо вверх в самом верху схлопывает обратно (progress остаётся ~1
 *   и дальше уменьшается, как в оригинале)
 *
 * Никаких timed-анимаций перехода: всё driven by scroll.
 */
export default function ScrollExpandLyrics({
  track,
  currentTime,
  getCurrentTime,
  duration,
  volume,
  onVolumeChange,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  isLoading,
  onClose,
  settings,
  t,
}) {
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [source, setSource] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [hasCustomLyrics, setHasCustomLyrics] = useState(false);

  const rootRef = useRef(null);
  const fillRef = useRef(null);
  const labelRef = useRef(null);
  const progressRef = useRef(0);
  const expandedRef = useRef(false);
  const touchYRef = useRef(0);
  const linesRef = useRef([]);
  const activeRef = useRef(-1);
  // Метка последнего ручного скролла: пока юзер крутит сам — доводка не мешает
  const lastUserRef = useRef(0);
  const onSeekRef = useRef(null);
  const getTimeRef = useRef(null);
  const fallbackTimeRef = useRef(0);
  const durRef = useRef(0);
  // Коалесцирование колеса: копим дельты, применяем максимум раз в кадр
  const wheelAcc = useRef(0);
  const wheelQueued = useRef(false);

  progressRef.current = progress;
  expandedRef.current = expanded;
  linesRef.current = lines;
  onSeekRef.current = onSeek;
  getTimeRef.current = getCurrentTime;
  fallbackTimeRef.current = currentTime || 0;

  const tr = (k, fb) => (typeof t === 'function' ? t(k) : fb || k);
  const isEn = settings?.language === 'en';
  const highlightColor = settings?.lyricsHighlightColor || '#ffdb4d';
  const textColor = settings?.lyricsTextColor || '#ffffff';
  const secondaryColor = settings?.lyricsSecondaryColor || '#888888';

  // Стабильный seek для memo-списка (onSeek из App пересоздаётся каждый рендер)
  const seekTo = useCallback((pos) => {
    const fn = onSeekRef.current;
    if (typeof fn === 'function') fn(pos);
    else window.dispatchEvent(new CustomEvent('lyrics:seek', { detail: pos }));
  }, []);

  const clampProgress = (next) => {
    const c = Math.min(Math.max(next, 0), 1);
    setProgress(c);
    if (c >= 1) {
      setExpanded(true);
      setShowContent(true);
      // Сразу после раскрытия разрешаем доводку до играющей строки
      lastUserRef.current = 0;
    } else if (c < 0.75) {
      setShowContent(false);
    }
  };

  const queueWheel = (d) => {
    wheelAcc.current += d;
    if (!wheelQueued.current) {
      wheelQueued.current = true;
      requestAnimationFrame(() => {
        wheelQueued.current = false;
        const acc = wheelAcc.current;
        wheelAcc.current = 0;
        if (acc !== 0 && !expandedRef.current) {
          clampProgress(progressRef.current + acc * 0.0009);
        }
      });
    }
  };

  const parseSynced = (text) => {
    const out = [];
    const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    const lns = text.split('\n');
    const toSec = (m) => {
      let ms = parseInt(m[3], 10);
      if (m[3].length === 2) ms *= 10;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + ms / 1000;
    };
    for (let i = 0; i < lns.length; i++) {
      const m = lns[i].match(re);
      if (!m) continue;
      const body = lns[i].replace(re, '').trim();
      if (!body) continue;
      let end = toSec(m) + 5;
      for (let j = i + 1; j < lns.length; j++) {
        const n = lns[j].match(re);
        if (n) { end = toSec(n); break; }
      }
      out.push({ text: body, startTime: toSec(m), endTime: end });
    }
    return out;
  };

  const loadLyrics = async (trk) => {
    setLoading(true);
    setError(null);
    setLyrics(null);
    setSource(null);
    setLines([]);
    activeRef.current = -1;
    setActiveLineIndex(-1);
    try {
      const res = await window.electron.lyrics.get(
        trk.id, trk.title, trk.artists, trk.album, trk.duration
      );
      if (res) {
        setLyrics(res);
        if (res.fromCustom) {
          setSource('custom');
          const p = parseSynced(res.plain);
          if (p.length) setLines(p);
        } else {
          setSource(res.source || (res.fromCache ? 'cache' : 'unknown'));
          if (res.synced) setLines(parseSynced(res.synced));
        }
      } else {
        setError(tr('main_no_lyrics', 'Текст не найден'));
      }
    } catch (e) {
      console.error('Lyrics load error:', e);
      setError('Ошибка загрузки текста');
    } finally {
      setLoading(false);
    }
  };

  // Сброс раздвижения + загрузка текста при смене трека
  useEffect(() => {
    setProgress(0);
    setExpanded(false);
    setShowContent(false);
    setIsEditing(false);
    activeRef.current = -1;
    if (rootRef.current) rootRef.current.scrollTop = 0;
    if (fillRef.current) fillRef.current.style.width = '0%';
    if (labelRef.current) labelRef.current.textContent = '0:00';
    if (track) {
      loadLyrics(track);
      window.electron.lyrics.getCustom(track.id)
        .then((c) => setHasCustomLyrics(!!c))
        .catch(() => {});
    } else {
      setLyrics(null);
      setLines([]);
      setActiveLineIndex(-1);
      setHasCustomLyrics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track && track.id]);

  // Нативные (непассивные) слушатели: перехват колеса/тача для раздвижки
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheel = (e) => {
      lastUserRef.current = Date.now();
      if (!expandedRef.current) {
        e.preventDefault();
        queueWheel(e.deltaY);
      } else if (e.deltaY < 0 && el.scrollTop <= 0) {
        // на самом верху раскрытого вида — схлопнуть обратно
        e.preventDefault();
        setExpanded(false);
      }
      // иначе — обычный скролл текста
    };

    const onTouchStart = (e) => {
      touchYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      lastUserRef.current = Date.now();
      const startY = touchYRef.current;
      if (!startY) return;
      const y = e.touches[0].clientY;
      const deltaY = startY - y;
      if (!expandedRef.current) {
        e.preventDefault();
        // те же пропорции, что в оригинале (0.008/0.005 против 0.0009 колеса)
        queueWheel(deltaY * (deltaY < 0 ? 8.9 : 5.5));
        touchYRef.current = y;
      } else if (deltaY < -20 && el.scrollTop <= 0) {
        e.preventDefault();
        setExpanded(false);
      }
    };

    const onTouchEnd = () => { touchYRef.current = 0; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Один rAF-цикл на всё: прогресс-бар и подпись времени — напрямую в DOM
  // (без setState 60 раз/сек), активная строка — setState только при смене.
  useEffect(() => {
    let raf;
    let lastSec = -1;
    const tick = () => {
      const g = getTimeRef.current;
      const cur = g ? g() : (fallbackTimeRef.current || 0);
      const d = durRef.current || 0;
      if (fillRef.current) {
        fillRef.current.style.width = d > 0 ? `${(cur / d) * 100}%` : '0%';
      }
      const s = Math.floor(cur);
      if (s !== lastSec) {
        lastSec = s;
        if (labelRef.current) labelRef.current.textContent = formatTime(cur);
      }
      const arr = linesRef.current;
      if (arr.length) {
        const idx = arr.findIndex((l) => cur >= l.startTime && cur <= l.endTime);
        if (idx !== -1 && idx !== activeRef.current) {
          activeRef.current = idx;
          setActiveLineIndex(idx);
          const root = rootRef.current;
          // Доводим до играющей строки, если юзер idle > 2с.
          // Без порога по scrollTop: после раскрытия ты наверху (0),
          // и доводка должна сама спуститься к строке.
          if (root && Date.now() - lastUserRef.current > 2000) {
            const lineEl = document.getElementById(`sel-line-${idx}`);
            if (lineEl && typeof lineEl.scrollIntoView === 'function') {
              lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startEdit = () => {
    setCustomText(lyrics?.plain || '');
    setIsEditing(true);
    // редактор — сразу в раскрытом виде
    setProgress(1);
    setExpanded(true);
    setShowContent(true);
  };

  const saveCustom = async () => {
    if (!track || !customText.trim()) return;
    try {
      await window.electron.lyrics.saveCustom(track.id, customText);
      setHasCustomLyrics(true);
      setIsEditing(false);
      loadLyrics(track);
    } catch (e) {
      console.error('Save custom error:', e);
    }
  };

  const deleteCustom = async () => {
    if (!track) return;
    try {
      await window.electron.lyrics.deleteCustom(track.id);
      setHasCustomLyrics(false);
      loadLyrics(track);
    } catch (e) {
      console.error('Delete custom error:', e);
    }
  };

  const sourceText = () => {
    switch (source) {
      case 'custom': return 'Мой текст';
      case 'yandex': return 'Яндекс.Музыка';
      case 'lrclib': return 'LRCLIB';
      case 'genius': return 'Genius';
      case 'textovoi': return 'Textovoi';
      case 'megalyrics': return 'Megalyrics';
      case 'cache': return 'Кэш';
      default: return '';
    }
  };

  // --- Геометрия раздвижки: те же формулы, что на сайте ---
  const mediaWidth = 300 + progress * (isMobile ? 650 : 1250);
  const mediaHeight = 400 + progress * (isMobile ? 200 : 400);
  const tx = progress * (isMobile ? 180 : 150);

  const titleStr = track ? track.title : 'FLOWMUSIC';
  const cover = hdCover(track && track.cover);
  const blurredBg = useBlurredBg(cover);
  const dur = duration || (track && track.durationMs ? track.durationMs / 1000 : 0);
  durRef.current = dur;
  // Та же GIF-настройка, что и в остальном приложении (Settings -> GIF-фон)
  const showGif = settings?.enableGifBackground && settings?.gifPath;
  // Подсказка гаснет по мере раздвижки; текст — напрямую, без t-ключа
  const hintText = !expanded
    ? (isEn ? 'Scroll down to reveal the lyrics' : 'Листайте вниз — там текст песни')
    : null;
  const hintOpacity = Math.max(0, 1 - progress * 1.6);

  return (
    <div
      ref={rootRef}
      className={`sel-root ${expanded ? 'is-expanded' : ''}`}
      style={{
        '--sel-dim': secondaryColor,
        ...(showGif ? { background: 'transparent' } : null),
      }}
    >
      {showGif && (
        <img
          src={settings.gifPath}
          className="sel-gif"
          style={{
            opacity: settings.gifOpacity || 0.3,
            filter: `blur(${settings.gifBlur || 0}px)`,
          }}
          alt=""
          draggable={false}
        />
      )}
      {/* Фон — предблюр с canvas (дешёвый), гаснет по мере раздвижки.
          При включённом GIF-фоне его заменяет гифка из настроек. */}
      {!showGif && (
      <div className="sel-bg" style={{ opacity: 1 - progress }}>
        {blurredBg
          ? <img src={blurredBg} className="sel-bg-img static" alt="" draggable={false} decoding="async" />
          : cover
            ? <img src={cover} alt="" draggable={false} decoding="async" />
            : <div className="sel-bg-fallback" />}
        <div className="sel-bg-shade" />
      </div>
      )}
      {showGif && <div className="sel-bg-shade sel-shade-fixed" />}

      {/* Кнопка назад поверх hero */}
      <button className="sel-back sel-back-float" onClick={onClose}>
        <PrevIcon size={16} /> {tr('nav_back', 'Назад')}
      </button>

      {/* HERO: карточка раздвигается скроллом (memo — строки не трогаем) */}
      <HeroView
        w={mediaWidth}
        h={mediaHeight}
        tx={tx}
        cover={cover}
        title={titleStr}
        artists={track ? track.artists : null}
        hintText={hintText}
        hintOpacity={hintOpacity}
      />

      {/* КОНТЕНТ: проявляется только когда картинка раздвинута */}
      <section
        className="sel-content"
        style={{ opacity: showContent ? 1 : 0, pointerEvents: showContent ? 'auto' : 'none' }}
      >
        {!track && (
          <div className="sel-center">
            <span className="sel-big-emoji">🎵</span>
            <p>{tr('player_empty_title', 'Выберите трек')}</p>
          </div>
        )}

        {track && loading && (
          <div className="sel-center">
            <div className="sel-spinner" />
            <p>{tr('main_loading', 'Загрузка...')}</p>
          </div>
        )}

        {track && !loading && (
          <>
            <div className="sel-toolbar">
              {sourceText() && <span className="sel-badge">{sourceText()}</span>}
              <span className="sel-spacer" />
              {!isEditing && (
                <>
                  <button className="sel-icon-btn" title={tr('main_add_lyrics', 'Добавить текст')} onClick={startEdit}>
                    {hasCustomLyrics ? '✏️' : <AddIcon size={16} />}
                  </button>
                  {hasCustomLyrics && (
                    <button className="sel-icon-btn" title="Удалить свой текст" onClick={deleteCustom}>🗑️</button>
                  )}
                </>
              )}
            </div>

            <div className="sel-controls">
              <div className="sel-transport">
                <button className="sel-ctl" onClick={onPrevious}><PrevIcon size={20} /></button>
                <button className="sel-ctl play" onClick={onPlayPause}>
                  {isLoading ? '⏳' : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                </button>
                <button className="sel-ctl" onClick={onNext}><NextIcon size={20} /></button>
              </div>
              <div className="sel-progress">
                <span ref={labelRef}>0:00</span>
                <div
                  className="sel-bar"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - r.left) / r.width) * (dur || 0));
                  }}
                >
                  <div ref={fillRef} className="sel-filled" style={{ width: '0%' }} />
                </div>
                <span>{formatTime(dur)}</span>
              </div>
              <div className="sel-vol">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={volume ?? 0.7}
                  onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
                />
                <span>{Math.round((volume ?? 0.7) * 100)}%</span>
              </div>
            </div>

            {isEditing ? (
              <div className="sel-editor">
                <p className="sel-editor-track">{track.title} — {track.artists}</p>
                <p className="sel-editor-hint">💡 Синхронизация: <code>[00:00.00] Текст строки</code></p>
                <textarea
                  className="sel-textarea"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="[00:00.00] Строка с таймкодом&#10;или обычный текст"
                  autoFocus
                />
                <div className="sel-editor-actions">
                  <button className="sel-primary-btn" onClick={saveCustom}>💾 Сохранить</button>
                  <button className="sel-ghost-btn" onClick={() => setIsEditing(false)}>{tr('modal_cancel', 'Отмена')}</button>
                </div>
              </div>
            ) : lines.length > 0 ? (
              <LinesList
                lines={lines}
                activeIndex={activeLineIndex}
                highlightColor={highlightColor}
                onLineSeek={seekTo}
              />
            ) : lyrics?.plain ? (
              <div className="sel-lines">
                {lyrics.plain.split('\n').filter((l) => l.trim()).map((line, i) => (
                  <p key={i} className="sel-plain" style={{ color: textColor }}>{line}</p>
                ))}
              </div>
            ) : (
              <div className="sel-center">
                <p className="sel-error">{error || tr('main_no_lyrics', 'Текст не найден')}</p>
                <button className="sel-primary-btn" onClick={startEdit}>
                  <AddIcon size={16} /> {tr('main_add_lyrics', 'Добавить текст')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Липкий минибар снизу раскрытого вида: обложка + текст по центру, без кнопок */}
      {showContent && track && (
        <div className="sel-minibar">
          {cover && <img src={cover} alt="" draggable={false} decoding="async" />}
          <div className="sel-minibar-meta">
            <strong>{track.title}</strong>
            <span>{track.artists}</span>
          </div>
        </div>
      )}
    </div>
  );
}
