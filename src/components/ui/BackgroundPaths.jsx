import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './BackgroundPaths.css';

/**
 * BackgroundPaths — порт 21st.dev background-paths под Flowmusic.
 *
 * Отличия от оригинала (.tsx + Next + Tailwind + shadcn Button):
 * - Tailwind-классы заменены на BackgroundPaths.css (bp-*).
 * - shadcn Button НЕ портирован: тянуть @radix-ui/react-slot +
 *   class-variance-authority ради одной кнопки не нужно — вместо
 *   демо-CTA компонент принимает children (форма авторизации).
 * - framer-motion уже есть в проекте, ставить ничего не надо.
 * - Пути и длительности считаются один раз в useMemo (в оригинале
 *   Math.random() в рендере дёргал длительности на каждый ререндер).
 * - Тёмная тема как основная; цвета через var(--primary-color).
 *
 * Props:
 * @param {string} [title] — заголовок с посимвольной spring-анимацией
 * @param {string} [subtitle] — подзаголовок под ним
 * @param {React.ReactNode} [children] — контент поверх (форма)
 * @param {number} [lines] — число линий в каждом слое (по умолч. 36)
 */
function buildPaths(position, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    opacity: 0.1 + i * 0.03,
    duration: 20 + Math.random() * 10,
  }));
}

const FloatingPaths = React.memo(function FloatingPaths({ position, count }) {
  const paths = useMemo(() => buildPaths(position, count), [position, count]);

  return (
    <div className="bp-paths" aria-hidden="true">
      <svg
        className="bp-svg"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
});

export function BackgroundPaths({
  title = 'Flowmusic',
  subtitle,
  children,
  lines = 36,
}) {
  const words = title.split(' ');

  return (
    <div className="bp-root">
      <div className="bp-layers">
        <FloatingPaths position={1} count={lines} />
        <FloatingPaths position={-1} count={lines} />
      </div>

      <div className="bp-content">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="bp-inner"
        >
          <h1 className="bp-title">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="bp-word">
                {word.split('').map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="bp-letter"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          {subtitle && <p className="bp-subtitle">{subtitle}</p>}

          {children}
        </motion.div>
      </div>
    </div>
  );
}

export default BackgroundPaths;
