import React, { createContext, useCallback, useContext, useState } from 'react';
import './Accordion.css';

/**
 * Accordion — порт 21st.dev settings-sidebar-accordion под Flowmusic.
 *
 * Отличия от оригинала (.tsx + Tailwind + lucide-react):
 * - Свой контекст + useState вместо Radix Accordion: ноль новых зависимостей.
 * - Tailwind-классы заменены на Accordion.css (ac-*).
 * - Раскрытие мгновенное, без height-анимации (проект без анимаций).
 * - Иконки — существующие эмодзи-глифы, lucide не требуется.
 * - Триггер дополнительно дергает onSelect: выбор группы = выбор таба.
 *
 * API: Accordion(multiple, defaultValue) > AccordionItem(value) >
 *   AccordionTrigger(icon, label, active, onSelect) + AccordionContent.
 */
const AccCtx = createContext(null);

function useAcc() {
  const ctx = useContext(AccCtx);
  if (!ctx) throw new Error('AccordionItem must be used inside <Accordion>');
  return ctx;
}

export function Accordion({ multiple = true, defaultValue = [], className = '', children }) {
  const [open, setOpen] = useState(defaultValue);
  const toggle = useCallback(
    (v) => {
      setOpen((prev) => {
        const has = prev.includes(v);
        if (multiple) return has ? prev.filter((x) => x !== v) : [...prev, v];
        return has ? [] : [v];
      });
    },
    [multiple],
  );
  const openValue = useCallback(
    (v) => {
      setOpen((prev) => (prev.includes(v) ? prev : [...prev, v]));
    },
    [],
  );
  return (
    <AccCtx.Provider value={{ open, toggle, openValue }}>
      <div className={`ac-root ${className}`}>{children}</div>
    </AccCtx.Provider>
  );
}

export function AccordionItem({ value, className = '', children }) {
  const { open } = useAcc();
  const isOpen = open.includes(value);
  return (
    <div className={`ac-item${isOpen ? ' open' : ''} ${className}`} data-value={value}>
      {children}
    </div>
  );
}

export function AccordionTrigger({ value, icon, label, active, onSelect, className = '' }) {
  const { toggle } = useAcc();
  return (
    <button
      type="button"
      aria-expanded={undefined}
      className={`ac-trigger${active ? ' active' : ''} ${className}`}
      onClick={() => {
        toggle(value);
        if (onSelect) onSelect(value);
      }}
    >
      <span className="ac-trigger-left">
        {icon && <span className="ac-icon">{icon}</span>}
        <span className="ac-label">{label}</span>
      </span>
      <span className="ac-chev" aria-hidden="true" />
    </button>
  );
}

export function AccordionContent({ value, className = '', children }) {
  const { open } = useAcc();
  if (value !== undefined && !open.includes(value)) return null;
  return <div className={`ac-content ${className}`}>{children}</div>;
}

export default Accordion;
