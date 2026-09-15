import React from 'react';
import './BorderBeam.css';

/**
 * BorderBeam — порт npm-пакета border-beam под Flowmusic.
 *
 * Оригинал — React-компонент с бегущим световым лучом по рамке.
 * Пакет НЕ ставим: эффект — это чистый CSS (conic-gradient + @property),
 * завёрнутый в div, внешних зависимостей у него нет.
 *
 * Props (совместимы с демо из задачи):
 * @param {'line'|'full'|number} [size='line'] — длина луча (градусы дуги)
 * @param {'default'|'colorful'} [colorVariant='default'] — белый или градиент
 * @param {number} [duration=4] — секунд на полный оборот
 * @param {number} [borderRadius=20] — радиус, должен совпадать с контентом
 * @param {number} [borderWidth=1.5] — толщина луча (px)
 * @param {boolean} [reverse=false] — крутить против часовой
 */
const BEAM_SPAN = { line: 60, full: 220 };

export function BorderBeam({
  children,
  size = 'line',
  colorVariant = 'default',
  duration = 4,
  borderRadius = 20,
  borderWidth = 1.5,
  reverse = false,
  className = '',
  style,
}) {
  const span = typeof size === 'number' ? size : BEAM_SPAN[size] || BEAM_SPAN.line;
  return (
    <div className={`bb-wrap ${className}`} style={style}>
      {children}
      <div
        className={`bb-beam bb-${colorVariant}`}
        aria-hidden="true"
        style={{
          '--bb-duration': `${duration}s`,
          '--bb-radius': `${borderRadius}px`,
          '--bb-width': `${borderWidth}px`,
          '--bb-span': `${span}deg`,
          animationDirection: reverse ? 'reverse' : undefined,
        }}
      />
    </div>
  );
}

export default BorderBeam;
