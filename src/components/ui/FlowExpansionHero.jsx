import React, { useEffect } from 'react';
import { FaSearch, FaMicrophoneAlt, FaSlidersH, FaHeart } from 'react-icons/fa';
import ScrollExpandMedia from './ScrollExpandMedia';

/**
 * FlowExpansionHero — готовый hero для Flowmusic.
 *
 * ВНИМАНИЕ: это замена demo.tsx из исходной задачи.
 * Вместо анимации-переключателя "Video / Image" и generic-текста
 * "About This Component" здесь зафиксированный Flowmusic-сценарий:
 *
 *   свернуто  -> обложка концерта + "FLOWMUSIC без границ"
 *   скролл    -> медиа расширяется, заголовок разъезжается
 *   раскрыто  -> FlowExpandedContent: фичи + CTA-кнопки приложения
 *
 * Unsplash-ассеты (проверяемые ID, существуют):
 * - фон: photo-1470225620780-dba8ba36b745 (DJ-пульт)
 * - медиа: photo-1493225457124-a3eb161ffa5f (концерт)
 */

export const FLOW_ASSETS = {
  background:
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&q=80&auto=format&fit=crop',
  cover:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1280&q=80&auto=format&fit=crop',
  // Опциональное видео для mediaType="video" (публичный сэмпл Google, точно существует).
  // Локально в Electron <video> проиграет его без YouTube-iframe.
  sampleVideo:
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  samplePoster:
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1280&q=80&auto=format&fit=crop',
};

const FEATURES = [
  {
    icon: <FaSearch size={20} />,
    title: '3 сервиса в одном',
    text: 'Яндекс Музыка, VK Музыка и SoundCloud — поиск и плейлисты рядом.',
  },
  {
    icon: <FaMicrophoneAlt size={20} />,
    title: 'Синхронные тексты',
    text: 'Караоке-подсветка строк, клик по строке — перемотка трека.',
  },
  {
    icon: <FaSlidersH size={20} />,
    title: 'Эквалайзер 10 полос',
    text: 'Пресеты Rock / Pop / Bass / Vocal и ручная настройка.',
  },
  {
    icon: <FaHeart size={20} />,
    title: 'Избранное и шаринг',
    text: 'Лайки, локальные плейлисты и обмен по 6-значному коду.',
  },
];

export function FlowExpandedContent({ onGoSearch, onGoPlaylists, lang = 'ru' }) {
  const en = lang === 'en';
  return (
    <div className="flow-expanded">
      <span className="flow-eyebrow">{en ? 'Flowmusic — inside' : 'Flowmusic — внутри'}</span>
      <h2>{en ? 'What opens after the scroll' : 'Что открывается после скролла'}</h2>
      <p>
        {en
          ? 'This block replaces the demo "About This Component" text. It is the expanded mode: instead of lorem ipsum, the user sees real app entry points.'
          : 'Этот блок — замена демо-текста «About This Component». Это и есть раскрытый режим: вместо заглушки пользователь видит реальные точки входа в приложение.'}
      </p>

      <div className="flow-grid">
        {FEATURES.map((f) => (
          <div className="flow-card" key={f.title}>
            {f.icon}
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      <div className="flow-cta">
        <button className="flow-btn flow-btn-primary" onClick={onGoSearch}>
          {en ? 'Open search' : 'Открыть поиск'}
        </button>
        <button className="flow-btn flow-btn-ghost" onClick={onGoPlaylists}>
          {en ? 'My playlists' : 'Мои плейлисты'}
        </button>
      </div>

      <div className="flow-stats">
        <span>3 {en ? 'services' : 'сервиса'}</span>
        <span>•</span>
        <span>10 {en ? 'EQ bands' : 'полос EQ'}</span>
        <span>•</span>
        <span>{en ? 'Synced lyrics' : 'Синхронные тексты'}</span>
        <span>•</span>
        <span>Discord RPC</span>
      </div>
    </div>
  );
}

/**
 * Каноничное использование. Никаких кнопок Video/Image —
 * режим зафиксирован на image, чтобы hero выглядел стабильно в Electron
 * (video-автопроигрывание в десктопе часто блокируется/мигает).
 */
export default function FlowExpansionHero({
  lang = 'ru',
  onGoSearch,
  onGoPlaylists,
  onExpandedChange,
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const en = lang === 'en';

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScrollExpandMedia
        mediaType="image"
        mediaSrc={FLOW_ASSETS.cover}
        bgImageSrc={FLOW_ASSETS.background}
        title={en ? 'FLOWMUSIC without borders' : 'FLOWMUSIC без границ'}
        date={en ? 'Your music • Lyrics • Equalizer' : 'Твоя музыка • Тексты • Эквалайзер'}
        scrollToExpand={en ? 'Scroll to expand' : 'Скролль чтобы раскрыть'}
        textBlend
        onExpandedChange={onExpandedChange}
      >
        <FlowExpandedContent
          lang={lang}
          onGoSearch={onGoSearch}
          onGoPlaylists={onGoPlaylists}
        />
      </ScrollExpandMedia>
    </div>
  );
}

/* --- Варианты из demo.tsx, портированные 1:1 (если понадобятся) --- */

export function VideoExpansion({ lang = 'ru', onGoSearch, onGoPlaylists }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const en = lang === 'en';
  return (
    <ScrollExpandMedia
      mediaType="video"
      mediaSrc={FLOW_ASSETS.sampleVideo}
      posterSrc={FLOW_ASSETS.samplePoster}
      bgImageSrc={FLOW_ASSETS.background}
      title={en ? 'Immersive Video Experience' : 'Живое видео-превью'}
      date={en ? 'Cosmic Journey' : 'Твоя волна'}
      scrollToExpand={en ? 'Scroll to Expand Demo' : 'Скролль чтобы раскрыть'}
    >
      <FlowExpandedContent lang={lang} onGoSearch={onGoSearch} onGoPlaylists={onGoPlaylists} />
    </ScrollExpandMedia>
  );
}

export function ImageExpansion({ lang = 'ru', onGoSearch, onGoPlaylists }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const en = lang === 'en';
  return (
    <ScrollExpandMedia
      mediaType="image"
      mediaSrc={FLOW_ASSETS.cover}
      bgImageSrc={FLOW_ASSETS.background}
      title={en ? 'Dynamic Image Showcase' : 'Динамическая обложка'}
      date={en ? 'Underwater Adventure' : 'Концертный вайб'}
      scrollToExpand={en ? 'Scroll to Expand Demo' : 'Скролль чтобы раскрыть'}
    >
      <FlowExpandedContent lang={lang} onGoSearch={onGoSearch} onGoPlaylists={onGoPlaylists} />
    </ScrollExpandMedia>
  );
}
