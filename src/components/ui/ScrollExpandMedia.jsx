import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './ScrollExpandMedia.css';

/**
 * ScrollExpandMedia — порт 21st.dev scroll-expansion-hero под Flowmusic.
 *
 * Отличия от оригинала (.tsx + Next + Tailwind):
 * - `next/image` заменён на обычный <img> (Next нет в Electron/webpack-проекте,
 *   ставить `next` НЕ нужно — он потянет свой сервер/роутер и сломает сборку).
 * - Tailwind-классы заменены на ScrollExpandMedia.css (Tailwind в проекте не установлен).
 * - TypeScript-типы убраны, это JSX. TS ставить необязательно.
 * - Починен импорт WheelEvent/TouchEvent из 'react' (их там нет — это DOM-типы).
 * - Перехват wheel/touch/scroll ограничен зоной компонента (sectionRef),
 *   чтобы не блокировать скролл всего приложения, когда hero не на экране.
 *
 * Props:
 * @param {'video'|'image'} mediaType
 * @param {string} mediaSrc
 * @param {string} [posterSrc]
 * @param {string} bgImageSrc
 * @param {string} [title]
 * @param {string} [date]
 * @param {string} [scrollToExpand]
 * @param {boolean} [textBlend] — mix-blend-difference для заголовка
 * @param {React.ReactNode} [children] — контент раскрытого режима
 * @param {(expanded: boolean) => void} [onExpandedChange]
 */
export default function ScrollExpandMedia({
  mediaType = 'video',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
  onExpandedChange,
}) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isMobileState, setIsMobileState] = useState(false);

  const sectionRef = useRef(null);
  const progressRef = useRef(0);
  const expandedRef = useRef(false);
  progressRef.current = scrollProgress;
  expandedRef.current = mediaFullyExpanded;

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
  }, [mediaType, mediaSrc]);

  useEffect(() => {
    if (typeof onExpandedChange === 'function') onExpandedChange(mediaFullyExpanded);
  }, [mediaFullyExpanded, onExpandedChange]);

  useEffect(() => {
    // Перехватываем скролл только когда hero видим на экране,
    // иначе ломаем скролл списков треков в .main-content
    const isSectionInView = () => {
      const el = sectionRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.9 && r.bottom > window.innerHeight * 0.1;
    };

    const applyProgress = (next) => {
      const clamped = Math.min(Math.max(next, 0), 1);
      setScrollProgress(clamped);
      if (clamped >= 1) {
        setMediaFullyExpanded(true);
        setShowContent(true);
      } else if (clamped < 0.75) {
        setShowContent(false);
      }
    };

    const handleWheel = (e) => {
      if (!isSectionInView()) return;
      const expanded = expandedRef.current;
      const progress = progressRef.current;
      if (expanded && e.deltaY < 0 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!expanded) {
        e.preventDefault();
        applyProgress(progress + e.deltaY * 0.0009);
      }
    };

    const handleTouchStart = (e) => {
      setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      if (!isSectionInView()) return;
      setTouchStartY((startY) => {
        if (!startY) return startY;
        const touchY = e.touches[0].clientY;
        const deltaY = startY - touchY;
        const expanded = expandedRef.current;
        const progress = progressRef.current;

        if (expanded && deltaY < -20 && window.scrollY <= 5) {
          setMediaFullyExpanded(false);
          e.preventDefault();
        } else if (!expanded) {
          e.preventDefault();
          const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
          applyProgress(progress + deltaY * scrollFactor);
          return touchY;
        }
        return startY;
      });
    };

    const handleTouchEnd = () => setTouchStartY(0);

    const handleScroll = () => {
      // Держим страницу наверху только пока идёт анимация раскрытия
      if (!expandedRef.current && progressRef.current > 0 && isSectionInView()) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const checkIfMobile = () => setIsMobileState(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const mediaWidth = 300 + scrollProgress * (isMobileState ? 650 : 1250);
  const mediaHeight = 400 + scrollProgress * (isMobileState ? 200 : 400);
  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  const firstWord = title ? title.split(' ')[0] : '';
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : '';

  const isYoutube = mediaType === 'video' && typeof mediaSrc === 'string' && mediaSrc.includes('youtube.com');
  const youtubeEmbed = isYoutube
    ? mediaSrc.includes('embed')
      ? mediaSrc + (mediaSrc.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1'
      : mediaSrc.replace('watch?v=', 'embed/') +
        '?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playlist=' +
        (mediaSrc.split('v=')[1] || '')
    : null;

  return (
    <div ref={sectionRef} className="sem-root">
      <section className="sem-section">
        <div className="sem-stage">
          <motion.div
            className="sem-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <img src={bgImageSrc} alt="" className="sem-bg-img" draggable={false} />
            <div className="sem-bg-overlay" />
          </motion.div>

          <div className="sem-container">
            <div className="sem-viewport">
              <div
                className="sem-media-card"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                }}
              >
                {mediaType === 'video' ? (
                  isYoutube ? (
                    <div className="sem-media-fill sem-no-pointer">
                      <iframe
                        width="100%"
                        height="100%"
                        src={youtubeEmbed}
                        className="sem-media-el sem-rounded"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={title || 'video'}
                      />
                      <div className="sem-click-shield" />
                      <motion.div
                        className="sem-tint sem-rounded"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  ) : (
                    <div className="sem-media-fill sem-no-pointer">
                      <video
                        src={mediaSrc}
                        poster={posterSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="sem-media-el sem-rounded sem-cover"
                        controls={false}
                        disablePictureInPicture
                        disableRemotePlayback
                      />
                      <div className="sem-click-shield" />
                      <motion.div
                        className="sem-tint sem-rounded"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )
                ) : (
                  <div className="sem-media-fill">
                    <img
                      src={mediaSrc}
                      alt={title || 'Media content'}
                      className="sem-media-el sem-rounded sem-cover"
                      draggable={false}
                    />
                    <motion.div
                      className="sem-tint sem-rounded"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0.7 - scrollProgress * 0.3 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                <div className="sem-hints">
                  {date && (
                    <p className="sem-hint" style={{ transform: `translateX(-${textTranslateX}vw)` }}>
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className="sem-hint sem-hint-strong"
                      style={{ transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              <div className={`sem-title-row ${textBlend ? 'sem-blend' : ''}`}>
                <motion.h2 className="sem-title" style={{ transform: `translateX(-${textTranslateX}vw)` }}>
                  {firstWord}
                </motion.h2>
                <motion.h2 className="sem-title" style={{ transform: `translateX(${textTranslateX}vw)` }}>
                  {restOfTitle}
                </motion.h2>
              </div>
            </div>

            <motion.section
              className="sem-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
              style={{ pointerEvents: showContent ? 'auto' : 'none' }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
}
