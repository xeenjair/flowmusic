import React, { createContext, useCallback, useContext, useId, useState } from 'react';
import './VerTabs.css';

/**
 * VerTabs — порт 21st.dev v-tabs-13 (vertical underline tabs) под Flowmusic.
 *
 * Отличия от оригинала (.tsx + Tailwind + @radix-ui/react-tabs):
 * - Свой контекст + useState вместо Radix: ставить @radix-ui/react-tabs,
 *   @radix-ui/react-label, @radix-ui/react-separator, cva и lucide-react
 *   ради табов не нужно — ноль новых зависимостей.
 * - Tailwind-классы заменены на VerTabs.css (vt-*).
 * - Переключение мгновенное, без ползущего индикатора: активный таб
 *   помечается статичной полоской слева (проект без анимаций по решению).
 * - Иконки — существующие эмодзи-глифы секций, lucide не требуется.
 *
 * API повторяет Radix-структуру: Tabs > TabsList > TabsTab + TabsPanel.
 */
const TabsCtx = createContext(null);

function useTabs() {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error('TabsTab/TabsPanel must be used inside <Tabs>');
  return ctx;
}

export function Tabs({
  value,
  defaultValue = 'profile',
  onValueChange,
  orientation = 'vertical',
  children,
}) {
  const [inner, setInner] = useState(defaultValue);
  const active = value !== undefined ? value : inner;
  const select = useCallback(
    (v) => {
      if (value === undefined) setInner(v);
      if (onValueChange) onValueChange(v);
    },
    [value, onValueChange],
  );
  const baseId = useId();
  return (
    <TabsCtx.Provider value={{ active, select, orientation, baseId }}>
      {children}
    </TabsCtx.Provider>
  );
}

export function TabsList({ className = '', variant, children, ...rest }) {
  const { orientation } = useTabs();

  // Клавиатура как в Radix: стрелки ходят по табам и сразу активируют
  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'));
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const next = tabs[(idx + (fwd ? 1 : -1) + tabs.length) % tabs.length];
    if (next) {
      next.focus();
      next.click();
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={`vt-list ${orientation === 'vertical' ? 'vt-vertical' : ''} ${
        variant === 'underline' ? 'vt-underline' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TabsTab({ value, className = '', children, ...rest }) {
  const { active, select, baseId } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      className={`${className}${selected ? ' active' : ''}`}
      onClick={() => select(value)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ value, className = '', children, ...rest }) {
  const { active, baseId } = useTabs();
  if (active !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={`vt-panel ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Separator({ className = '', ...rest }) {
  return <div role="separator" className={`vt-separator ${className}`} {...rest} />;
}

export default Tabs;
