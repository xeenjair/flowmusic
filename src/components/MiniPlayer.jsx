import React, { useEffect, useRef, useState } from 'react';
import { PrevIcon, PlayIcon, PauseIcon, NextIcon, CloseIcon, NoteIcon, LyricsIcon } from './icons/Icons';

// Компактное окно поверх всех окон. Состояние присылает главное окно через mini:push,
// команды (playpause/prev/next/close) уходят обратно через mini:command.
// Два режима: очередь (прошлый/текущий/следующий трек) и текст песни
// (прошлая/текущая/следующая строки, текущая светлая). В режиме текста
// кнопки показываются поверх обложки только при наведении.
// Нет текста — мини сам ужимается до одной обложки на всё окно с кнопками.
// Шрифт и иконки — те же, что в приложении (карта синхронизирована с FONT_STACKS в App.jsx).
const FONT_STACKS = {
  minecraft: "'Minecraft', 'VT323', monospace",
  default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  jetbrains: "'JetBrains Mono', Consolas, 'Courier New', monospace",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  caveat: "'Caveat', 'Comic Sans MS', 'Segoe Script', cursive",
  russo: "'Russo One', Impact, 'Arial Black', sans-serif",
  montserrat: "'Montserrat', 'Segoe UI', Roboto, sans-serif",
  oswald: "'Oswald', 'Arial Narrow', sans-serif",
  rubik: "'Rubik', 'Segoe UI', Roboto, sans-serif",
  comfortaa: "'Comfortaa', 'Segoe UI', cursive",
  pacifico: "'Pacifico', 'Comic Sans MS', cursive",
  alegreya: "'Alegreya', Georgia, serif",
  raleway: "'Raleway', 'Segoe UI', Roboto, sans-serif"
};

function rowLabel(t) {
  if (!t) return '';
  return t.artists ? `${t.title} — ${t.artists}` : (t.title || '');
}

function parseLrc(lyricsText) {
  const lines = String(lyricsText || '').split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(timeRegex);
    if (!match) continue;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    let ms = parseInt(match[3], 10);
    if (match[3].length === 2) ms *= 10;
    const startTime = minutes * 60 + seconds + ms / 1000;
    const text = lines[i].replace(timeRegex, '').trim();
    if (!text) continue;
    let endTime = startTime + 5;
    for (let j = i + 1; j < lines.length; j++) {
      const nm = lines[j].match(timeRegex);
      if (nm) {
        let nms = parseInt(nm[3], 10);
        if (nm[3].length === 2) nms *= 10;
        endTime = parseInt(nm[1], 10) * 60 + parseInt(nm[2], 10) + nms / 1000;
        break;
      }
    }
    parsed.push({ text, startTime, endTime });
  }
  return parsed;
}

export default function MiniPlayer() {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prev, setPrev] = useState(null);
  const [next, setNext] = useState(null);
  const [liveTime, setLiveTime] = useState(0);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('flowmusic_mini_view') || 'lyrics'; } catch { return 'lyrics'; }
  });
  const [lines, setLines] = useState([]);
  const [noSync, setNoSync] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [fontStack, setFontStack] = useState(FONT_STACKS.minecraft);
  // Локальные часы: между пушами времени из главного окна (2/с) мини сам
  // докручивает время, чтобы строки караоке переключались без опозданий
  const clockRef = useRef({ t: 0, at: 0, playing: false });

  useEffect(() => {
    if (!window.electron?.mini?.onUpdate) return undefined;
    const off = window.electron.mini.onUpdate((s) => {
      if (!s) return;
      if (s.track !== undefined) setTrack(s.track);
      if (s.isPlaying !== undefined) {
        setIsPlaying(s.isPlaying);
        clockRef.current.playing = s.isPlaying;
      }
      if (s.prev !== undefined) setPrev(s.prev);
      if (s.next !== undefined) setNext(s.next);
      if (s.time !== undefined) {
        clockRef.current = { t: s.time, at: performance.now(), playing: clockRef.current.playing };
        setLiveTime(s.time);
      }
    });
    return off;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const c = clockRef.current;
      if (!c.playing) return;
      const est = c.t + (performance.now() - c.at) / 1000;
      setLiveTime(prevT => (Math.abs(prevT - est) > 0.05 ? est : prevT));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.electron.settings.get();
        const fam = s?.fontFamily || 'minecraft';
        setFontStack(FONT_STACKS[fam] || fam || FONT_STACKS.default);
      } catch { /* ignore */ }
    })();
  }, []);

  // Подгрузка синхронного текста для текущего трека (кэш в main-процессе)
  useEffect(() => {
    let alive = true;
    setLines([]);
    setNoSync(false);
    if (!track?.id) return undefined;
    setLyricsLoading(true);
    (async () => {
      try {
        const res = await window.electron.lyrics.get(
          track.id, track.title, track.artists, track.album, track.duration
        );
        if (!alive) return;
        const src = res ? (res.fromCustom ? res.plain : res.synced) : null;
        const parsed = src ? parseLrc(src) : [];
        if (parsed.length > 0) {
          setLines(parsed);
          setNoSync(false);
        } else {
          setNoSync(true);
        }
      } catch {
        if (alive) setNoSync(true);
      } finally {
        if (alive) setLyricsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [track?.id]);

  const cmd = (c) => {
    try { window.electron.mini.command(c); } catch { /* ignore */ }
  };

  const toggleView = () => {
    setView(v => {
      const nv = v === 'queue' ? 'lyrics' : 'queue';
      try { localStorage.setItem('flowmusic_mini_view', nv); } catch { /* ignore */ }
      return nv;
    });
  };

  // Нет текста — ужимаемся до одной обложки (только загруженный результат, не мигаем)
  const compact = view === 'lyrics' && !!track && !lyricsLoading && (noSync || lines.length === 0);

  useEffect(() => {
    try {
      window.electron.mini.resize(compact ? { width: 160, height: 160 } : { width: 430, height: 170 });
    } catch { /* ignore */ }
  }, [compact]);

  let activeIdx = -1;
  if (lines.length > 0) {
    const exact = lines.findIndex(l => liveTime >= l.startTime && liveTime <= l.endTime);
    if (exact !== -1) {
      activeIdx = exact;
    } else {
      let last = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startTime <= liveTime) last = i;
        else break;
      }
      activeIdx = last === -1 ? 0 : last;
    }
  }
  const lyricPrev = activeIdx > 0 ? lines[activeIdx - 1] : null;
  const lyricCur = activeIdx !== -1 ? lines[activeIdx] : null;
  const lyricNext = activeIdx !== -1 && activeIdx < lines.length - 1 ? lines[activeIdx + 1] : null;

  const cover = track?.cover
    ? <img src={track.cover} alt="" className="mini-cover" draggable={false} />
    : <div className="mini-cover mini-cover-ph"><NoteIcon size={26} /></div>;

  const coverWithControls = (
    <div className="mini-cover-wrap">
      {cover}
      <div className="mini-cover-controls">
        <button type="button" className="mini-cover-btn" onClick={() => cmd('prev')}>
          <PrevIcon size={16} />
        </button>
        <button type="button" className="mini-cover-btn" onClick={() => cmd('playpause')}>
          {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
        <button type="button" className="mini-cover-btn" onClick={() => cmd('next')}>
          <NextIcon size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className={`mini-player${compact ? ' compact' : ''}`} style={{ fontFamily: fontStack }}>
      <div className="mini-body">
        {view === 'queue' ? (
          <>
            {cover}
            <div className="mini-queue">
              {prev && (
                <div className="mini-queue-row" title={rowLabel(prev)} onClick={() => cmd('prev')}>
                  {rowLabel(prev)}
                </div>
              )}
              <div
                key={track?.id || 'empty'}
                className="mini-queue-row current mini-line-enter"
                title={track ? rowLabel(track) : 'Flowmusic'}
                onClick={() => cmd('playpause')}
              >
                {track ? rowLabel(track) : 'Flowmusic'}
              </div>
              {next && (
                <div className="mini-queue-row" title={rowLabel(next)} onClick={() => cmd('next')}>
                  {rowLabel(next)}
                </div>
              )}
            </div>
            <div className="mini-controls">
              <button type="button" className="mini-btn" onClick={() => cmd('prev')}>
                <PrevIcon size={20} />
              </button>
              <button type="button" className="mini-btn mini-btn-play" onClick={() => cmd('playpause')}>
                {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
              </button>
              <button type="button" className="mini-btn" onClick={() => cmd('next')}>
                <NextIcon size={20} />
              </button>
              <button type="button" className="mini-btn" title="Текст" onClick={toggleView}>
                <LyricsIcon size={18} />
              </button>
            </div>
          </>
        ) : compact ? (
          <>
            {coverWithControls}
            <button type="button" className="mini-close" onClick={() => cmd('close')}>
              <CloseIcon size={14} />
            </button>
          </>
        ) : (
          <>
            {coverWithControls}
            <div className="mini-queue">
              {lyricsLoading ? (
                <div className="mini-queue-row">…</div>
              ) : (
                <>
                  {lyricPrev && (
                    <div className="mini-queue-row" title={lyricPrev.text}>
                      {lyricPrev.text}
                    </div>
                  )}
                  {lyricCur && (
                    <div
                      key={`${activeIdx}-${lyricCur.startTime}`}
                      className="mini-queue-row current mini-line-enter"
                      title={lyricCur.text}
                    >
                      {lyricCur.text}
                    </div>
                  )}
                  {lyricNext && (
                    <div className="mini-queue-row" title={lyricNext.text}>
                      {lyricNext.text}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mini-controls">
              <button type="button" className="mini-btn active" title="Очередь" onClick={toggleView}>
                <LyricsIcon size={18} />
              </button>
            </div>
          </>
        )}
        {!compact && (
          <button type="button" className="mini-close" onClick={() => cmd('close')}>
            <CloseIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
