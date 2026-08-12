import React, { useMemo, useRef, useState, useEffect } from 'react';
import { CloseIcon } from './icons/Icons';
import './SettingsView.css';

const FONTS = [
  { value: 'default', label: 'Default', ru: 'По умолчанию', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { value: 'minecraft', label: 'Minecraft', ru: 'Minecraft', stack: "'Minecraft', 'VT323', monospace" },
  { value: 'inter', label: 'Inter', ru: 'Inter', stack: "'Inter', -apple-system, 'Segoe UI', sans-serif" },
  { value: 'jetbrains', label: 'JetBrains Mono', ru: 'JetBrains Mono', stack: "'JetBrains Mono', Consolas, monospace" },
  { value: 'playfair', label: 'Playfair Display', ru: 'Playfair Display', stack: "'Playfair Display', Georgia, serif" },
  { value: 'caveat', label: 'Caveat', ru: 'Caveat', stack: "'Caveat', 'Comic Sans MS', cursive" },
  { value: 'russo', label: 'Russo One', ru: 'Russo One', stack: "'Russo One', Impact, sans-serif" },
  { value: 'montserrat', label: 'Montserrat', ru: 'Montserrat', stack: "'Montserrat', 'Segoe UI', sans-serif" },
  { value: 'oswald', label: 'Oswald', ru: 'Oswald', stack: "'Oswald', 'Arial Narrow', sans-serif" },
  { value: 'rubik', label: 'Rubik', ru: 'Rubik', stack: "'Rubik', 'Segoe UI', sans-serif" },
  { value: 'comfortaa', label: 'Comfortaa', ru: 'Comfortaa', stack: "'Comfortaa', 'Segoe UI', cursive" },
  { value: 'pacifico', label: 'Pacifico', ru: 'Pacifico', stack: "'Pacifico', 'Comic Sans MS', cursive" },
  { value: 'alegreya', label: 'Alegreya', ru: 'Alegreya', stack: "'Alegreya', Georgia, serif" },
  { value: 'raleway', label: 'Raleway', ru: 'Raleway', stack: "'Raleway', 'Segoe UI', sans-serif" }
];

const SettingsView = React.memo(function SettingsView({ settings, onSave, onClose, onSelectGif, onClearLyricsCache, subscriptionActive, onOpenSubscription, t }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [activeSection, setActiveSection] = useState('appearance');
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    setLocalSettings(settings || {});
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const isEnglish = localSettings.language === 'en';

  const sections = [
    {
      id: 'appearance',
      label: isEnglish ? 'Appearance' : 'Внешний вид',
      description: isEnglish ? 'Colors, theme and styling' : 'Цвета, тема и оформление',
      icon: '✦'
    },
    {
      id: 'interface',
      label: isEnglish ? 'Interface' : 'Интерфейс',
      description: isEnglish ? 'Language, fonts, display mode' : 'Язык, шрифты, режим отображения',
      icon: '🖥️'
    },
    {
      id: 'audio',
      label: isEnglish ? 'Audio' : 'Аудио',
      description: isEnglish ? 'Quality and playback' : 'Качество и воспроизведение',
      icon: '◉'
    },
    {
      id: 'effects',
      label: isEnglish ? 'Effects' : 'Эффекты',
      description: isEnglish ? 'Visual features' : 'Визуальные фишки интерфейса',
      icon: '✧'
    },
    {
      id: 'shortcuts',
      label: isEnglish ? 'Shortcuts' : 'Клавиши',
      description: isEnglish ? 'Quick actions' : 'Быстрые действия',
      icon: '⌘'
    },
    {
      id: 'system',
      label: isEnglish ? 'System' : 'Система',
      description: isEnglish ? 'Cache, notifications and data' : 'Кэш, уведомления и данные',
      icon: '⚙'
    },
    {
      id: 'premium',
      label: isEnglish ? 'Premium' : 'Premium',
      description: subscriptionActive
        ? (isEnglish ? 'Your subscription is active' : 'Подписка активна')
        : (isEnglish ? 'Unlock exclusive features' : 'Откройте эксклюзивные функции'),
      icon: subscriptionActive ? '✅' : '👑'
    }
  ];

  const activeMeta = sections.find(section => section.id === activeSection);

  const appearanceCards = useMemo(() => ([
    {
      title: isEnglish ? 'Color scheme' : 'Цветовая схема',
      subtitle: isEnglish ? 'Basic interface colors' : 'Базовые цвета интерфейса',
      items: [
        { key: 'primaryColor', label: isEnglish ? 'Primary color' : 'Основной цвет', type: 'color', value: localSettings.primaryColor || '#8b5cf6' },
        { key: 'accentColor', label: isEnglish ? 'Accent' : 'Акцент', type: 'color', value: localSettings.accentColor || '#a78bfa' },
        { key: 'backgroundColor', label: isEnglish ? 'Background' : 'Фон', type: 'color', value: localSettings.backgroundColor || '#0b0b12' },
        { key: 'cardColor', label: isEnglish ? 'Cards' : 'Карточки', type: 'color', value: localSettings.cardColor || '#151520' }
      ]
    },
    {
      title: isEnglish ? 'Settings window colors' : 'Цвета окна настроек',
      subtitle: isEnglish ? 'Separate palette specifically for this screen' : 'Отдельная палитра именно для этого экрана',
      items: [
        { key: 'settingsAccentColor', label: isEnglish ? 'Settings accent' : 'Акцент настроек', type: 'color', value: localSettings.settingsAccentColor || '#8b5cf6' },
        { key: 'settingsSidebarColor', label: isEnglish ? 'Settings sidebar' : 'Сайдбар настроек', type: 'color', value: localSettings.settingsSidebarColor || '#111320' },
        { key: 'settingsPanelColor', label: isEnglish ? 'Panel background' : 'Фон панели', type: 'color', value: localSettings.settingsPanelColor || '#0f111c' },
        { key: 'settingsCardTint', label: isEnglish ? 'Card tint' : 'Тон карточек', type: 'color', value: localSettings.settingsCardTint || '#1b2030' }
      ]
    },
    {
      title: isEnglish ? 'Song lyrics colors' : 'Цвета текста песен',
      subtitle: isEnglish ? 'Colors for lyrics mode' : 'Цвета для режима lyrics',
      items: [
        { key: 'lyricsHighlightColor', label: isEnglish ? 'Line accent' : 'Акцент строки', type: 'color', value: localSettings.lyricsHighlightColor || '#ffdb4d' },
        { key: 'lyricsTextColor', label: isEnglish ? 'Main text' : 'Основной текст', type: 'color', value: localSettings.lyricsTextColor || '#ffffff' },
        { key: 'lyricsSecondaryColor', label: isEnglish ? 'Secondary text' : 'Вторичный текст', type: 'color', value: localSettings.lyricsSecondaryColor || '#888888' }
      ]
    }
  ]), [localSettings, isEnglish]);

  const audioCards = useMemo(() => ([
    {
      title: isEnglish ? 'Playback' : 'Воспроизведение',
      subtitle: isEnglish ? 'How the music sounds' : 'То, как звучит музыка',
      items: [
        { key: 'crossfade', label: isEnglish ? 'Crossfade' : 'Кроссфейд', type: 'range', value: localSettings.crossfade ?? 3, min: 0, max: 10, step: 0.5, format: (v) => `${v}${isEnglish ? 's' : 'с'}` },
        { key: 'volumeNormalization', label: isEnglish ? 'Volume normalization' : 'Нормализация громкости', type: 'switch', value: localSettings.volumeNormalization || false, hint: isEnglish ? 'Make track volumes more even' : 'Сделать громкость треков более ровной' }
      ]
    },
    {
      title: isEnglish ? 'Quality' : 'Качество',
      subtitle: isEnglish ? 'Visual preset selector' : 'Визуальный селектор пресетов',
      items: [
        { key: 'quality', label: 'High · 320 kbps', type: 'choice', choiceValue: 'high', value: localSettings.quality || 'high' },
        { key: 'quality', label: 'Medium · 192 kbps', type: 'choice', choiceValue: 'medium', value: localSettings.quality || 'high' },
        { key: 'quality', label: 'Low · 128 kbps', type: 'choice', choiceValue: 'low', value: localSettings.quality || 'high' }
      ]
    }
  ]), [localSettings, isEnglish]);

  const interfaceCards = useMemo(() => ([
    {
      title: isEnglish ? 'Basic Settings' : 'Основные настройки',
      subtitle: isEnglish ? 'Language and appearance' : 'Язык и внешний вид',
      items: [
        { key: 'language', label: isEnglish ? 'Interface Language' : 'Язык интерфейса', type: 'choice', choiceValue: 'ru', value: localSettings.language || 'ru', options: [
          { value: 'ru', label: 'Русский' },
          { value: 'en', label: 'English' }
        ] },
        { key: 'fontSize', label: isEnglish ? 'Font Size' : 'Размер шрифта', type: 'range', value: localSettings.fontSize || 16, min: 12, max: 20, step: 1, format: (v) => `${v}px` }
      ]
    },
    {
      title: isEnglish ? 'Fonts' : 'Шрифты',
      subtitle: isEnglish ? 'Scroll the menu and pick a font — each row previews its look' : 'Пролистай меню и выбери шрифт — каждая строка показывает его пример',
      items: [
        { key: 'fontFamily', label: '', type: 'fonts', value: localSettings.fontFamily || 'minecraft' }
      ]
    },
    {
      title: isEnglish ? 'Display Mode' : 'Режим отображения',
      subtitle: isEnglish ? 'Fullscreen or windowed mode' : 'Полноэкранный или оконный режим',
      items: [
        { key: 'isFullscreen', label: isEnglish ? 'Fullscreen Mode' : 'Полноэкранный режим', type: 'switch', value: localSettings.isFullscreen || false, hint: isEnglish ? 'Application will take up the entire screen' : 'Приложение будет занимать весь экран' }
      ]
    },
    {
      title: isEnglish ? 'Interface' : 'Интерфейс',
      subtitle: isEnglish ? 'Main styling parameters' : 'Основные параметры оформления',
      items: [
        { key: 'darkTheme', label: isEnglish ? 'Dark theme' : 'Тёмная тема', type: 'switch', value: localSettings.darkTheme !== false, hint: isEnglish ? 'Use dark palette by default' : 'Использовать тёмную палитру по умолчанию' },
        { key: 'enableLiquidGlass', label: 'Liquid Glass', type: 'switch', value: localSettings.enableLiquidGlass || false, hint: isEnglish ? 'Add glass transparent panels' : 'Добавить стеклянные полупрозрачные панели' },
        { key: 'enableColorFromMusic', label: isEnglish ? 'Color from music' : 'Цвет под музыку', type: 'switch', value: localSettings.enableColorFromMusic !== false, hint: isEnglish ? 'Adjust interface shade to cover' : 'Подстраивать оттенок интерфейса под обложку' }
      ]
    }
  ]), [localSettings, isEnglish]);

  const effectsCards = useMemo(() => ([
    {
      title: isEnglish ? 'Visual effects' : 'Визуальные эффекты',
      subtitle: isEnglish ? 'Additional atmosphere elements' : 'Дополнительные элементы атмосферы',
      items: [
        { key: 'enableVisualizer', label: isEnglish ? 'Visualizer' : 'Визуализатор', type: 'switch', value: localSettings.enableVisualizer || false },
        { key: 'enableFullscreenCover', label: isEnglish ? 'Fullscreen cover' : 'Полноэкранная обложка', type: 'switch', value: localSettings.enableFullscreenCover || false },
        { key: 'animationsEnabled', label: isEnglish ? 'Interface animations' : 'Анимации интерфейса', type: 'switch', value: localSettings.animationsEnabled !== false }
      ]
    },
    {
      title: isEnglish ? 'Particles' : 'Частицы',
      subtitle: isEnglish ? 'Animated background effects' : 'Анимированные эффекты на фоне',
      items: [
        { key: 'particlesType', label: isEnglish ? 'Particle Type' : 'Тип частиц', type: 'choice', choiceValue: 'none', value: localSettings.particlesType || 'none', options: [
          { value: 'none', label: isEnglish ? 'Disabled' : 'Выключено' },
          { value: 'snow', label: isEnglish ? 'Snow' : 'Снег' },
          { value: 'fireflies', label: isEnglish ? 'Fireflies' : 'Светлячки' },
          { value: 'sakura', label: isEnglish ? 'Sakura' : 'Сакура' },
          { value: 'leaves', label: isEnglish ? 'Leaves' : 'Листья' },
          { value: 'hearts', label: isEnglish ? 'Hearts' : 'Сердца' },
          { value: 'orbs', label: isEnglish ? 'Glowing Orbs' : 'Светящиеся шары' },
          { value: 'grid', label: isEnglish ? 'Grid' : 'Сетка' },
          { value: 'galaxy', label: isEnglish ? 'Galaxy' : 'Галактика' },
          { value: 'fog', label: isEnglish ? 'Fog' : 'Туман' },
          { value: 'clouds', label: isEnglish ? 'Clouds' : 'Облака' },
          { value: 'storm', label: isEnglish ? 'Storm' : 'Гроза' },
          { value: 'triangles', label: isEnglish ? 'Triangles' : 'Треугольники' },
          { value: 'web', label: isEnglish ? 'Web' : 'Сеть' },
          { value: 'crosses', label: isEnglish ? 'Crosses' : 'Кресты' },
          { value: 'rings', label: isEnglish ? 'Rings' : 'Кольца' }
        ] }
      ]
    },
    {
      title: isEnglish ? 'Animated background' : 'Анимированный фон',
      subtitle: isEnglish ? 'Visual block without logic binding' : 'Визуальный блок без привязки к логике',
      items: [
        { key: 'enableGifBackground', label: isEnglish ? 'Enable GIF background' : 'Включить GIF-фон', type: 'switch', value: localSettings.enableGifBackground || false, hint: isEnglish ? 'Show animated background' : 'Показывать анимированный задний фон' },
        { key: 'gifOpacity', label: isEnglish ? 'Opacity' : 'Прозрачность', type: 'range', value: localSettings.gifOpacity ?? 0.3, min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
        { key: 'gifBlur', label: isEnglish ? 'Blur' : 'Размытие', type: 'range', value: localSettings.gifBlur ?? 0, min: 0, max: 20, step: 1, format: (v) => `${v}px` },
        { key: 'gifPath', label: isEnglish ? 'Background source' : 'Источник фона', type: 'fake-file', value: localSettings.gifPath || '', hint: localSettings.gifPath ? (isEnglish ? 'File selected' : 'Файл выбран') : (isEnglish ? 'File not selected' : 'Файл не выбран') }
      ]
    }
  ]), [localSettings, isEnglish]);

  const shortcuts = isEnglish ? [
    ['Space', 'Play / Pause'],
    ['Ctrl + →', 'Next track'],
    ['Ctrl + ←', 'Previous track'],
    ['Ctrl + F', 'Search'],
    ['Ctrl + L', 'Song lyrics'],
    ['Ctrl + S', 'Save playlist'],
    ['Ctrl + ,', 'Open settings']
  ] : [
    ['Пробел', 'Play / Pause'],
    ['Ctrl + →', 'Следующий трек'],
    ['Ctrl + ←', 'Предыдущий трек'],
    ['Ctrl + F', 'Поиск'],
    ['Ctrl + L', 'Текст песни'],
    ['Ctrl + S', 'Сохранить плейлист'],
    ['Ctrl + ,', 'Открыть настройки']
  ];

  const systemCards = useMemo(() => ([
    {
      title: isEnglish ? 'System' : 'Система',
      subtitle: isEnglish ? 'Service interface parameters' : 'Служебные параметры интерфейса',
      items: [
        { key: 'showNotifications', label: isEnglish ? 'Notifications when changing track' : 'Уведомления при смене трека', type: 'switch', value: localSettings.showNotifications || false },
        { key: 'cache', label: isEnglish ? 'Lyrics cache' : 'Кэш текстов', type: 'action', value: isEnglish ? 'Clear' : 'Очистить' },
        { key: 'version', label: isEnglish ? 'Version' : 'Версия', type: 'badge', value: 'flowmusic v2.0.0' }
      ]
    },
    {
      title: isEnglish ? 'Integrations' : 'Интеграции',
      subtitle: isEnglish ? 'Connect external services' : 'Подключение внешних сервисов',
      items: [
        { key: 'enableDiscordRPC', label: isEnglish ? 'Discord Rich Presence' : 'Discord Rich Presence', type: 'switch', value: localSettings.enableDiscordRPC || false, hint: isEnglish ? 'Show music status in Discord' : 'Показывать статус музыки в Discord' }
      ]
    }
  ]), [localSettings, isEnglish]);

  const premiumCards = useMemo(() => subscriptionActive ? [
    {
      title: isEnglish ? 'Your Premium Features' : 'Ваши премиум-функции',
      subtitle: isEnglish ? 'Available with active subscription' : 'Доступны с активной подпиской',
      items: [
        { key: 'premium_themes', label: isEnglish ? 'Custom themes' : 'Кастомные темы', type: 'premium-check', value: true, hint: isEnglish ? 'Choose from exclusive themes' : 'Выбирайте из эксклюзивных тем' },
        { key: 'premium_quality', label: 'High Quality Audio', type: 'premium-check', value: true, hint: '320 kbps' },
        { key: 'premium_export', label: isEnglish ? 'Export playlists' : 'Экспорт плейлистов', type: 'premium-check', value: true, hint: isEnglish ? 'JSON / CSV' : 'JSON / CSV' },
        { key: 'premium_stats', label: isEnglish ? 'Listening statistics' : 'Статистика прослушиваний', type: 'premium-check', value: true, hint: isEnglish ? 'Detailed analytics' : 'Детальная аналитика' },
        { key: 'premium_support', label: isEnglish ? 'Priority support' : 'Приоритетная поддержка', type: 'premium-check', value: true, hint: isEnglish ? 'Telegram / Discord @xeenjair' : 'Telegram / Discord @xeenjair' },
      ]
    },
    {
      title: isEnglish ? 'Cloud Sync' : 'Облачная синхронизация',
      subtitle: isEnglish ? 'Your data across devices' : 'Ваши данные на всех устройствах',
      items: [
        { key: 'premium_sync', label: isEnglish ? 'Settings & playlists sync' : 'Синхронизация настроек и плейлистов', type: 'switch', value: localSettings.enableCloudSync || false, hint: isEnglish ? 'Coming soon' : 'Скоро появится' },
      ]
    }
  ] : [
    {
      title: isEnglish ? 'FlowMusic Premium' : 'FlowMusic Premium',
      subtitle: isEnglish ? '99 ₽/месяц' : '99 ₽/месяц',
      items: [
        { key: 'premium_themes', label: isEnglish ? 'Custom themes' : 'Кастомные темы', type: 'premium-lock', value: false, hint: isEnglish ? 'Exclusive visual styles' : 'Эксклюзивные визуальные стили' },
        { key: 'premium_quality', label: 'High Quality Audio', type: 'premium-lock', value: false, hint: '320 kbps' },
        { key: 'premium_export', label: isEnglish ? 'Export playlists' : 'Экспорт плейлистов', type: 'premium-lock', value: false, hint: isEnglish ? 'JSON / CSV format' : 'JSON / CSV формат' },
        { key: 'premium_stats', label: isEnglish ? 'Listening statistics' : 'Статистика прослушиваний', type: 'premium-lock', value: false, hint: isEnglish ? 'Detailed playback analytics' : 'Детальная аналитика прослушиваний' },
        { key: 'premium_support', label: isEnglish ? 'Priority support' : 'Приоритетная поддержка', type: 'premium-lock', value: false, hint: isEnglish ? 'Direct contact with developer' : 'Прямой контакт с разработчиком' },
      ]
    },
    {
      title: isEnglish ? 'Get Premium' : 'Купить подписку',
      subtitle: isEnglish ? 'Unlock all features' : 'Откройте все возможности',
      items: [
        { key: 'premium_buy', label: isEnglish ? 'Subscribe for 99 ₽/month' : 'Оформить за 99 ₽/мес', type: 'premium-buy', value: false },
      ]
    }
  ], [localSettings, subscriptionActive, isEnglish]);

  const renderItem = (item) => {
    if (item.type === 'color') {
      return (
        <label key={item.key} className="settings-control color-control">
          <div>
            <span className="control-label">{item.label}</span>
            <span className="control-hint">{item.value}</span>
          </div>
          <div className="color-pill">
            <input
              type="color"
              value={item.value}
              onChange={(e) => handleChange(item.key, e.target.value)}
            />
            <span>{item.value}</span>
          </div>
        </label>
      );
    }

    if (item.type === 'switch') {
      return (
        <label key={item.key} className="settings-control switch-control">
          <div>
            <span className="control-label">{item.label}</span>
            {item.hint && <span className="control-hint">{item.hint}</span>}
          </div>
          <button
            type="button"
            className={`switch ${item.value ? 'active' : ''}`}
            onClick={() => handleChange(item.key, !item.value)}
          >
            <span className="switch-thumb" />
          </button>
        </label>
      );
    }

    if (item.type === 'range') {
      return (
        <div key={item.key} className="settings-control range-control">
          <div className="range-header">
            <div>
              <span className="control-label">{item.label}</span>
              <span className="control-hint">Пока только визуальная часть</span>
            </div>
            <span className="range-value">{item.format ? item.format(item.value) : item.value}</span>
          </div>
          <input
            type="range"
            min={item.min}
            max={item.max}
            step={item.step}
            value={item.value}
            onChange={(e) => handleChange(item.key, item.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
          />
        </div>
      );
    }

    if (item.type === 'fonts') {
      const activeFont = FONTS.find(f => f.value === (localSettings.fontFamily || 'minecraft')) || FONTS[0];
      return (
        <div key={item.key} className="fonts-cards-wrap">
          <span className="fonts-cards-current" style={{ '--preview-font': activeFont.stack }}>
            {isEnglish ? 'Current' : 'Текущий'}: {isEnglish ? activeFont.label : (activeFont.ru || activeFont.label)}
          </span>
          <div className="fonts-cards">
            {FONTS.map(font => (
              <button
                key={font.value}
                type="button"
                className={`font-card ${localSettings.fontFamily === font.value ? 'active' : ''}`}
                style={{ '--preview-font': font.stack }}
                onClick={() => handleChange('fontFamily', font.value)}
              >
                <span className="font-card-preview">Аа Бб 123</span>
                <span className="font-card-name">
                  {isEnglish ? font.label : (font.ru || font.label)}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (item.type === 'choice') {
      if (item.options) {
        // Dropdown choice
        return (
          <div key={item.key} className="settings-control select-control">
            <div>
              <span className="control-label">{item.label}</span>
              <span className="control-hint">Текущий: {item.options.find(o => o.value === item.value)?.label || item.value}</span>
            </div>
            <select
              value={item.value}
              onChange={(e) => handleChange(item.key, e.target.value)}
              className="settings-select"
            >
              {item.options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        );
      } else {
        // Single choice card
        const active = item.value === item.choiceValue;
        return (
          <button
            key={`${item.key}-${item.choiceValue}`}
            type="button"
            className={`choice-card ${active ? 'active' : ''}`}
            onClick={() => handleChange(item.key, item.choiceValue)}
          >
            <span>{item.label}</span>
            <span className="choice-indicator" />
          </button>
        );
      }
    }

    if (item.type === 'fake-file') {
      return (
        <div key={item.key} className="settings-control file-control">
          <div>
            <span className="control-label">{item.label}</span>
            <span className="control-hint">{item.hint}</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={async () => {
              if (!onSelectGif) return;
              const selectedPath = await onSelectGif();
              if (selectedPath) handleChange(item.key, selectedPath);
            }}
          >
            Выбрать файл
          </button>
        </div>
      );
    }

    if (item.type === 'action') {
      return (
        <div key={item.key} className="settings-control action-control">
          <div>
            <span className="control-label">{item.label}</span>
            <span className="control-hint">Очистить сохранённый кэш текстов песен</span>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={async () => {
              if (item.key === 'cache' && onClearLyricsCache) {
                await onClearLyricsCache();
              }
            }}
          >
            {item.value}
          </button>
        </div>
      );
    }

    if (item.type === 'text') {
      return (
        <div key={item.key} className="settings-control text-control">
          <div>
            <span className="control-label">{item.label}</span>
            <span className="control-hint">{item.hint}</span>
          </div>
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleChange(item.key, e.target.value)}
            className="settings-text-input"
          />
        </div>
      );
    }

    if (item.type === 'badge') {
      return (
        <div key={item.key} className="settings-control badge-control">
          <div>
            <span className="control-label">{item.label}</span>
            <span className="control-hint">{item.hint}</span>
          </div>
          <span className="status-badge">{item.value}</span>
        </div>
      );
    }

    if (item.type === 'premium-check') {
      return (
        <div key={item.key} className="settings-control premium-control premium-unlocked">
          <div className="premium-control-content">
            <span className="premium-check-icon">✅</span>
            <div>
              <span className="control-label">{item.label}</span>
              <span className="control-hint">{item.hint}</span>
            </div>
          </div>
          <span className="premium-badge-open">Доступно</span>
        </div>
      );
    }

    if (item.type === 'premium-lock') {
      return (
        <div key={item.key} className="settings-control premium-control premium-locked">
          <div className="premium-control-content">
            <span className="premium-lock-icon">🔒</span>
            <div>
              <span className="control-label">{item.label}</span>
              <span className="control-hint">{item.hint}</span>
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'premium-buy') {
      return (
        <div key={item.key} className="settings-control premium-control premium-buy-control">
          <button
            className="premium-buy-now-btn"
            onClick={() => onOpenSubscription?.()}
          >
            <span className="premium-buy-crown">👑</span>
            <span className="premium-buy-text">{item.label}</span>
            <span className="premium-buy-arrow">→</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const handleScrollByWheel = (e) => {
    // Disabled custom scroll to improve performance
    return;
  };

  const renderCards = () => {
    const cardsBySection = {
      appearance: appearanceCards,
      interface: interfaceCards,
      audio: audioCards,
      effects: effectsCards,
      system: systemCards,
      premium: premiumCards
    };

    if (activeSection === 'shortcuts') {
      return (
        <div className="settings-grid single-column">
          <section className="settings-card wide-card">
            <div className="card-head">
              <div>
                <h3>{isEnglish ? 'Hotkeys' : 'Горячие клавиши'}</h3>
                <p>{isEnglish ? 'Compact list of quick actions in a new style' : 'Компактный список быстрых действий в новом стиле'}</p>
              </div>
            </div>

            <div className="shortcut-list modern">
              {shortcuts.map(([key, action]) => (
                <div key={key} className="shortcut-row">
                  <span className="shortcut-key">{key}</span>
                  <span className="shortcut-action">{action}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className={`settings-grid ${['appearance', 'interface'].includes(activeSection) ? '' : 'single-column'}`}>
        {(cardsBySection[activeSection] || []).map(card => (
          <section key={card.title} className="settings-card">
            <div className="card-head">
              <div>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
            </div>

            <div className="card-body">
              {card.items.map(renderItem)}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-shell"
        onClick={(e) => e.stopPropagation()}
        style={{
          '--settings-accent': localSettings.settingsAccentColor || '#8b5cf6',
          '--settings-sidebar-bg': localSettings.settingsSidebarColor || '#111320',
          '--settings-panel-bg': localSettings.settingsPanelColor || '#0f111c',
          '--settings-card-tint': localSettings.settingsCardTint || '#1b2030'
        }}
      >
        <aside className="settings-sidebar">
          <div className="settings-brand">
            <div className="brand-orb" />
            <div>
              <span className="brand-label">Flowmusic</span>
              <h2>Settings</h2>
            </div>
          </div>

          <nav className="settings-nav">
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-copy">
                  <span className="nav-title">{section.label}</span>
                  <span className="nav-subtitle">{section.description}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="settings-sidebar-footer">
            <div className="profile-card">
              <div className="profile-avatar">D</div>
              <div>
                <div className="profile-title">Desktop preset</div>
                <div className="profile-subtitle">Visual mode</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-topbar">
            <div>
              <span className="section-kicker">{isEnglish ? 'App Settings' : 'Настройки приложения'}</span>
              <h1>{activeMeta?.label}</h1>
              <p>{activeMeta?.description}</p>
            </div>
            <button type="button" className="settings-close" onClick={onClose}><CloseIcon size={20} /></button>
          </div>

          <div
            className="settings-scrollarea"
            ref={scrollAreaRef}
          >
            <div className="settings-content">
              {renderCards()}
            </div>
          </div>

          <footer className="settings-footer">
            <button type="button" className="btn-muted" onClick={onClose}>{isEnglish ? 'Cancel' : 'Отмена'}</button>
            <button type="button" className="btn-primary" onClick={handleSave}>{isEnglish ? 'Save' : 'Сохранить'}</button>
          </footer>
        </main>
      </div>
    </div>
  );
});

export default SettingsView;
