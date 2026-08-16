import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Titlebar from './components/Titlebar';
import LyricsView from './components/LyricsView';
import PlayerProgress from './components/PlayerProgress';
import SettingsView from './components/SettingsView';
import SubscriptionModal from './components/SubscriptionModal';
import YandexAuth from './components/YandexAuth';
import VkAuth from './components/VkAuth';
import VkMusicAPI from './services/VkMusicAPI';
import SoundCloud from './services/SoundCloudAPI';

import {
  HomeIcon, SearchIcon, LyricsIcon,
  PlayIcon, PauseIcon, NextIcon, PrevIcon,
  VolumeIcon, HeartIcon, SettingsIcon,
  CloseIcon, AddIcon, DeleteIcon,
  NoteIcon, HistoryIcon, PlaylistIcon,
  MixIcon, RepeatIcon, SpeakerIcon, TimeIcon
} from './components/icons/Icons';
import './App.css';



// ============ Nickname customization ============

// Solid colors for nickname
const SOLID_COLORS = [
  { id: 'default', ru: 'По умолчанию', en: 'Default', color: '#ffffff' },
  { id: 'red', ru: 'Красный', en: 'Red', color: '#ff4757' },
  { id: 'blue', ru: 'Синий', en: 'Blue', color: '#3742fa' },
  { id: 'green', ru: 'Зеленый', en: 'Green', color: '#2ed573' },
  { id: 'purple', ru: 'Фиолетовый', en: 'Purple', color: '#8b5cf6' },
  { id: 'gold', ru: 'Золотой', en: 'Gold', color: '#ffa502' },
  { id: 'pink', ru: 'Розовый', en: 'Pink', color: '#ff6b81' },
  { id: 'cyan', ru: 'Бирюзовый', en: 'Cyan', color: '#00cec9' },
  { id: 'orange', ru: 'Оранжевый', en: 'Orange', color: '#ff9f43' },
  { id: 'gray', ru: 'Серый', en: 'Gray', color: '#a0a0a0' }
];

// Gradient presets for nickname
const GRADIENT_PRESETS = [
  { id: 'rainbow', ru: 'Радуга', en: 'Rainbow', colors: ['#ff4757', '#3742fa', '#2ed573', '#ffa502'] },
  { id: 'sunset', ru: 'Закат', en: 'Sunset', colors: ['#ff6b35', '#f7931e', '#ffa502'] },
  { id: 'ocean', ru: 'Океан', en: 'Ocean', colors: ['#0984e3', '#3742fa', '#8b5cf6'] },
  { id: 'fire', ru: 'Огонь', en: 'Fire', colors: ['#f12711', '#f5af19', '#ffd700'] },
  { id: 'ice', ru: 'Лёд', en: 'Ice', colors: ['#00c6ff', '#0072ff', '#00e5ff'] },
  { id: 'candy', ru: 'Конфетка', en: 'Candy', colors: ['#ff6b9d', '#c4459c', '#ff6b9d'] },
  { id: 'forest', ru: 'Лес', en: 'Forest', colors: ['#00b894', '#00cec9', '#55efc4'] },
  { id: 'royal', ru: 'Королевский', en: 'Royal', colors: ['#6c5ce7', '#a29bfe', '#fd79a8'] },
  { id: 'galaxy', ru: 'Галактика', en: 'Galaxy', colors: ['#8e2de2', '#4a00e0', '#6c5ce7'] },
  { id: 'neon', ru: 'Неон', en: 'Neon', colors: ['#ff00ff', '#00ffff', '#ff00ff'] },
  { id: 'blood', ru: 'Кровь', en: 'Blood', colors: ['#cb356b', '#bd3f32', '#ff4d4d'] },
  { id: 'lime', ru: 'Лайм', en: 'Lime', colors: ['#a8ff78', '#78ffd6', '#a8ff78'] },
  { id: 'aurora', ru: 'Аврора', en: 'Aurora', colors: ['#00f5a0', '#00d9f5', '#7f00ff'] },
  { id: 'rosegold', ru: 'Розовое золото', en: 'Rose gold', colors: ['#f6d365', '#fda085', '#ff7eb3'] },
  { id: 'cyber', ru: 'Кибер', en: 'Cyber', colors: ['#00f5a0', '#00d9f5', '#00f5a0'] },
  { id: 'peachy', ru: 'Персик', en: 'Peach', colors: ['#ff9a9e', '#fad0c4', '#ff9a9e'] },
  { id: 'violet', ru: 'Фиолетовая вспышка', en: 'Violet flash', colors: ['#7f00ff', '#e100ff', '#7f00ff'] }
];

const isSolidColor = (id) => SOLID_COLORS.some(c => c.id === id);

const nicknameLabel = (lang, arr, id) => {
  const item = arr.find(i => i.id === id);
  if (!item) return id;
  return (lang === 'en' ? item.en : item.ru);
};

const nicknameGradientStyle = (gradId, direction, colorsOverride) => {
  const grad = GRADIENT_PRESETS.find(g => g.id === gradId);
  const colors = colorsOverride || (grad ? grad.colors : ['#ff4757', '#3742fa']);
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
};

// Gradient direction options
const NICKNAME_DIRECTIONS = [
  { id: '45deg', ru: 'Вниз-вправо ↘', en: 'Down-right ↘' },
  { id: '135deg', ru: 'Вниз-влево ↙', en: 'Down-left ↙' },
  { id: 'to right', ru: 'Вправо →', en: 'To right →' },
  { id: 'to left', ru: 'Влево ←', en: 'To left ←' },
  { id: 'to bottom', ru: 'Вниз ↓', en: 'To bottom ↓' },
  { id: 'to top', ru: 'Вверх ↑', en: 'To top ↑' }
];

// Animation (flow) directions
const NICKNAME_ANIM_DIRECTIONS = [
  { id: 'left', ru: 'Слева направо', en: 'Left to right' },
  { id: 'right', ru: 'Справа налево', en: 'Right to left' },
  { id: 'top', ru: 'Сверху вниз', en: 'Top to bottom' },
  { id: 'bottom', ru: 'Снизу вверх', en: 'Bottom to top' },
  { id: 'diagonal', ru: 'По диагонали', en: 'Diagonal' }
];

// Font options for nickname
const NICKNAME_FONTS = [
  { id: 'default', ru: 'По умолчанию', en: 'Default' },
  { id: 'minecraft', ru: 'Minecraft', en: 'Minecraft' },
  { id: 'inter', ru: 'Inter', en: 'Inter' },
  { id: 'jetbrains', ru: 'JetBrains Mono', en: 'JetBrains Mono' },
  { id: 'playfair', ru: 'Playfair Display', en: 'Playfair Display' },
  { id: 'caveat', ru: 'Caveat', en: 'Caveat' },
  { id: 'russo', ru: 'Russo One', en: 'Russo One' },
  { id: 'montserrat', ru: 'Montserrat', en: 'Montserrat' },
  { id: 'oswald', ru: 'Oswald', en: 'Oswald' },
  { id: 'rubik', ru: 'Rubik', en: 'Rubik' },
  { id: 'comfortaa', ru: 'Comfortaa', en: 'Comfortaa' },
  { id: 'pacifico', ru: 'Pacifico', en: 'Pacifico' },
  { id: 'alegreya', ru: 'Alegreya', en: 'Alegreya' },
  { id: 'raleway', ru: 'Raleway', en: 'Raleway' }
];

// Periodic gradient with two identical cycles (half the image each).
// With background-size 200% a single cycle == element width, so a
// 0% -> 100% background-position loop wraps seamlessly (no ping-pong).
const periodicGradient = (direction, colors) => {
  const n = colors.length;
  const stops = [];
  for (let i = 0; i < n; i++) stops.push(`${colors[i]} ${(i * 50 / n).toFixed(2)}%`);
  for (let i = 0; i < n; i++) stops.push(`${colors[i]} ${(50 + i * 50 / n).toFixed(2)}%`);
  stops.push(`${colors[0]} 100%`);
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
};

// Build full nickname style
const getNicknameStyle = (settings) => {
  const s = settings || {};
  const themeId = s.userColor || 'default';
  const direction = s.nicknameGradientDirection || '45deg';
  const style = {};

  if (isSolidColor(themeId)) {
    const solid = SOLID_COLORS.find(c => c.id === themeId) || SOLID_COLORS[0];
    style.color = solid.color;
  } else {
    if (themeId === 'custom') {
      const c1 = s.nicknameGradientColor1 || '#ff6b35';
      const c2 = s.nicknameGradientColor2 || '#3742fa';
      style.backgroundImage = s.nicknameAnimate
        ? periodicGradient(direction, [c1, c2])
        : `linear-gradient(${direction}, ${c1}, ${c2})`;
    } else {
      const grad = GRADIENT_PRESETS.find(g => g.id === themeId) || GRADIENT_PRESETS[0];
      style.backgroundImage = s.nicknameAnimate
        ? periodicGradient(direction, grad.colors)
        : nicknameGradientStyle(themeId, direction);
    }
    style.WebkitBackgroundClip = 'text';
    style.backgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.color = 'transparent';
    if (s.nicknameAnimate) {
      style.backgroundSize = '200% 200%';
      style.animationName = `nickname-flow-${s.nicknameAnimateDirection || 'left'}`;
      style.animationDuration = `${Math.max(1, Number(s.nicknameAnimateSpeed) || 4)}s`;
      style.animationTimingFunction = 'linear';
      style.animationIterationCount = 'infinite';
    }
  }

  if (s.nicknameBold) style.fontWeight = 700;
  if (s.nicknameItalic) style.fontStyle = 'italic';
  if (s.nicknameFont && s.nicknameFont !== 'default' && FONT_STACKS[s.nicknameFont]) {
    style.fontFamily = FONT_STACKS[s.nicknameFont];
  }
  if (s.nicknameGlow) {
    const blur = Math.max(2, Number(s.nicknameGlowBlur) || 8);
    style.textShadow = `0 0 ${blur}px ${s.nicknameGlowColor || '#ffffff'}`;
  }
  if (s.nicknameUppercase) style.textTransform = 'uppercase';
  if (s.nicknameLetterSpacing) style.letterSpacing = `${Number(s.nicknameLetterSpacing) || 0}px`;

  let className = '';
  if (!isSolidColor(themeId) && s.nicknameAnimate) {
    className = `nickname-animated nickname-animated-${s.nicknameAnimateDirection || 'left'}`;
  }

  return { style, className };
};

const avatarSrc = (filePath, fallback = '') => {
  if (!filePath) return fallback;
  return 'file:///' + filePath.replace(/\\/g, '/');
};

// SoundCloud виджет играет тише, поэтому усиливаем громкость
const SOUNDCLOUD_VOLUME_BOOST = 1.5;
const boostSoundCloudVolume = (v) => Math.min(1, (v || 0.7) * SOUNDCLOUD_VOLUME_BOOST);

// Font stacks for each selectable font family
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

// ============ Translations ============
const translations = {
  ru: {
    // Auth
    'auth_title': 'Flowmusic',
    'auth_subtitle': 'Войдите с помощью токена Яндекс.Музыки',
    'auth_token_placeholder': 'Вставьте ваш OAuth токен',
    'auth_button': 'Войти',
    'auth_error_generic': 'Ошибка авторизации',

    // Navigation
    'nav_home': 'Главная',
    'nav_search': 'Поиск',
    'nav_lyrics': 'Текст',
     'nav_back': 'Назад',

    // Sidebar
    'sidebar_mymedia': 'Моя медиатека',
    'sidebar_favorites': 'Любимые треки',
    'sidebar_history': 'История прослушивания',
    'sidebar_recommendations': 'Рекомендации',
    'sidebar_my_playlists': 'Мои плейлисты',
    'sidebar_quick_actions': 'Быстрые действия',
    'sidebar_shuffle': 'Перемешать',
    'sidebar_repeat': 'Режим повтор',
    'sidebar_repeat_none': 'Не повторять',
    'sidebar_repeat_all': 'Повторять все',
     'sidebar_repeat_one': 'Повторять один',
    'sidebar_logout': 'Выйти',
    'sidebar_local_tracks': 'Мои файлы',
    'sidebar_add_tracks': 'Добавить файлы',

    // Player
    'player_unknown_artist': 'Неизвестный исполнитель',
    'player_unknown_album': 'Неизвестный альбом',
    'player_empty_title': 'Выберите трек',
    'player_add_favorite': 'Добавить в избранное',
    'player_remove_favorite': 'Убрать из избранного',

    // Main content
    'main_search_placeholder': 'Что хотите послушать?',
    'main_search_clear': 'Очистить',
    'main_playlist_tracks': 'треков',
    'main_show_all_tracks': 'Все треки',
    'main_loading': 'Загрузка...',
    'main_error': 'Ошибка',
    'main_empty_search': 'Введите поисковый запрос',
    'main_empty_playlist': 'Выберите плейлист',
    'main_no_lyrics': 'Текст не найден',
     'main_add_lyrics': 'Добавить текст',
    'main_favorite_title': 'Избранные плейлисты',
    'main_favorite_empty': 'Добавьте избранные',
    'main_favorite_hint': 'Нажмите ☆ на плейлисте',
    'main_loading_recommendations': 'Загружаем рекомендации',
    'main_recommendations_soon': 'Персональные плейлисты скоро появятся',
    'main_recommendations': 'Рекомендации',
    'main_track_count': 'треков',
    'main_artist_results': 'Исполнители',
    'main_playlist_results': 'Рекомендуемые плейлисты',
    'main_track_title_header': 'Название',
    'main_album_header': 'Альбом',
    'main_delete_file': 'Удалить файл из списка',

    // Context menu
    'context_add_favorite': 'Добавить в избранное',
    'context_remove_favorite': 'Убрать из избранного',
    'context_add_to_playlist': 'Добавить в плейлист',
    'context_remove_from_playlist': 'Удалить из плейлиста',

    // Modals
    'modal_create_playlist': 'Создать плейлист',
    'modal_playlist_name': 'Название плейлиста',
    'modal_cancel': 'Отмена',
    'modal_create': 'Создать',

    // Settings
     'settings_title': 'Настройки',
     'settings_close': 'Закрыть',

    // Profile
    'profile_stats': 'Статистика',
    'profile_favorite_tracks': 'Любимых треков',
    'profile_recent_tracks': 'Недавних треков',
    'profile_playlists': 'Плейлистов',
    'profile_last_track': 'Последний трек',
    'profile_nickname': 'Никнейм',
    'profile_change_photo': 'Изменить фото',
    'profile_enter_nickname': 'Введите никнейм',
    'profile_nickname_unique': 'Никнейм должен быть уникальным',
    'profile_color': 'Оформление ника',
    'profile_color_default': 'По умолчанию',
    'profile_color_red': 'Красный',
    'profile_color_blue': 'Синий',
    'profile_color_green': 'Зеленый',
    'profile_color_purple': 'Фиолетовый',
    'profile_color_gold': 'Золотой',
    'profile_color_rainbow': 'Радуга',
    'profile_color_sunset': 'Закат',
    'profile_color_ocean': 'Океан',
    'profile_nickname_preview': 'Предпросмотр',
    'profile_nickname_theme': 'Цвет / градиент',
    'profile_nickname_solid': 'Цвет',
    'profile_nickname_gradient': 'Градиент',
    'profile_nickname_direction': 'Направление градиента',
    'profile_nickname_animation': 'Переливание градиента',
    'profile_nickname_anim_direction': 'Направление переливания',
    'profile_nickname_anim_speed': 'Скорость',
    'profile_nickname_font': 'Шрифт',
    'profile_nickname_effects': 'Эффекты',
    'profile_nickname_bold': 'Жирный',
    'profile_nickname_italic': 'Курсив',
    'profile_nickname_uppercase': 'Заглавные',
    'profile_nickname_glow': 'Свечение',
    'profile_nickname_glow_color': 'Цвет свечения',
    'profile_nickname_glow_blur': 'Интенсивность свечения',
    'profile_nickname_spacing': 'Межбуквенный интервал',
    'profile_nickname_custom': 'Свой градиент',
    'profile_nickname_color1': 'Цвет 1',
    'profile_nickname_color2': 'Цвет 2',
    'profile_logout': 'Выйти из аккаунта',

    // Toast
    'toast_repeat_none': 'Повтор: Не повторять',
    'toast_repeat_all': 'Повтор: Повторять все',
    'toast_repeat_one': 'Повтор: Повторять один',
     'font_default': 'По умолчанию',
     'font_sans_serif': 'Sans Serif',
     'font_serif': 'Serif',
     'font_monospace': 'Monospace',
     'font_cursive': 'Cursive',
     'font_fantasy': 'Fantasy',
     'font_minecraft': 'Minecraft',
      'service_yandex': 'Yandex.Музыка',
      'service_vk': 'VK Музыка',
      'service_current': 'Текущий сервис',
    'profile_change_service': 'Сменить сервис',

    // Feedback
    'feedback_contact': 'Есть предложения или вы нашли баг / или хотите поддержать обращяйтесь в телеграм или дискорд @xeenjair',
    'user_default': 'Пользователь'
  },
  en: {
    // Auth
    'auth_title': 'Flowmusic',
    'auth_subtitle': 'Sign in with Yandex.Music token',
    'auth_token_placeholder': 'Paste your OAuth token',
    'auth_button': 'Sign In',
    'auth_error_generic': 'Authorization error',

    // Navigation
    'nav_home': 'Home',
    'nav_search': 'Search',
    'nav_lyrics': 'Lyrics',
     'nav_back': 'Back',

    // Sidebar
    'sidebar_mymedia': 'My Media',
    'sidebar_favorites': 'Favorite Tracks',
    'sidebar_history': 'Listening History',
    'sidebar_recommendations': 'Recommendations',
    'sidebar_my_playlists': 'My Playlists',
    'sidebar_quick_actions': 'Quick Actions',
    'sidebar_shuffle': 'Shuffle',
    'sidebar_repeat': 'Repeat Mode',
    'sidebar_repeat_none': 'Don\'t repeat',
    'sidebar_repeat_all': 'Repeat all',
    'sidebar_repeat_one': 'Repeat one',
    'sidebar_logout': 'Logout',
    'sidebar_local_tracks': 'My Files',
    'sidebar_add_tracks': 'Add Files',

    // Player
    'player_unknown_artist': 'Unknown artist',
    'player_unknown_album': 'Unknown album',
    'player_empty_title': 'Select a track',
    'player_add_favorite': 'Add to favorites',
    'player_remove_favorite': 'Remove from favorites',

    // Main content
    'main_search_placeholder': 'What do you want to listen to?',
    'main_search_clear': 'Clear',
    'main_playlist_tracks': 'tracks',
    'main_show_all_tracks': 'All tracks',
    'main_loading': 'Loading...',
    'main_error': 'Error',
    'main_empty_search': 'Enter search query',
    'main_empty_playlist': 'Select a playlist',
    'main_no_lyrics': 'Lyrics not found',
     'main_add_lyrics': 'Add lyrics',
    'main_favorite_title': 'Favorite Playlists',
    'main_favorite_empty': 'Add favorites',
    'main_favorite_hint': 'Click ☆ on a playlist',
    'main_loading_recommendations': 'Loading recommendations',
    'main_recommendations_soon': 'Personal playlists coming soon',
    'main_recommendations': 'Recommendations',
    'main_track_count': 'tracks',
    'main_artist_results': 'Artists',
    'main_playlist_results': 'Recommended Playlists',
    'main_track_title_header': 'Title',
    'main_album_header': 'Album',
    'main_delete_file': 'Remove file from list',

    // Context menu
    'context_add_favorite': 'Add to favorites',
    'context_remove_favorite': 'Remove from favorites',
    'context_add_to_playlist': 'Add to playlist',
    'context_remove_from_playlist': 'Remove from playlist',

    // Modals
    'modal_create_playlist': 'Create Playlist',
    'modal_playlist_name': 'Playlist name',
    'modal_cancel': 'Cancel',
    'modal_create': 'Create',

    // Settings
    'settings_title': 'Settings',
    'settings_close': 'Close',

    // Profile
    'profile_stats': 'Statistics',
    'profile_favorite_tracks': 'Favorite tracks',
    'profile_recent_tracks': 'Recent tracks',
    'profile_playlists': 'Playlists',
    'profile_last_track': 'Last track',
    'profile_nickname': 'Nickname',
    'profile_change_photo': 'Change photo',
    'profile_enter_nickname': 'Enter nickname',
    'profile_nickname_unique': 'Nickname must be unique',
    'profile_color': 'Nickname style',
    'profile_color_default': 'Default',
    'profile_color_red': 'Red',
    'profile_color_blue': 'Blue',
    'profile_color_green': 'Green',
    'profile_color_purple': 'Purple',
    'profile_color_gold': 'Gold',
    'profile_color_rainbow': 'Rainbow',
    'profile_color_sunset': 'Sunset',
    'profile_color_ocean': 'Ocean',
    'profile_nickname_preview': 'Preview',
    'profile_nickname_theme': 'Color / gradient',
    'profile_nickname_solid': 'Solid',
    'profile_nickname_gradient': 'Gradient',
    'profile_nickname_direction': 'Gradient direction',
    'profile_nickname_animation': 'Gradient flow',
    'profile_nickname_anim_direction': 'Flow direction',
    'profile_nickname_anim_speed': 'Speed',
    'profile_nickname_font': 'Font',
    'profile_nickname_effects': 'Effects',
    'profile_nickname_bold': 'Bold',
    'profile_nickname_italic': 'Italic',
    'profile_nickname_uppercase': 'UPPERCASE',
    'profile_nickname_glow': 'Glow',
    'profile_nickname_glow_color': 'Glow color',
    'profile_nickname_glow_blur': 'Glow intensity',
    'profile_nickname_spacing': 'Letter spacing',
    'profile_nickname_custom': 'Custom gradient',
    'profile_nickname_color1': 'Color 1',
    'profile_nickname_color2': 'Color 2',
    'profile_logout': 'Logout',

    // Toast
    'toast_repeat_none': 'Repeat: Don\'t repeat',
    'toast_repeat_all': 'Repeat: Repeat all',
    'toast_repeat_one': 'Repeat: Repeat one',
     'font_default': 'Default',
     'font_sans_serif': 'Sans Serif',
     'font_serif': 'Serif',
     'font_monospace': 'Monospace',
     'font_cursive': 'Cursive',
     'font_fantasy': 'Fantasy',
     'font_minecraft': 'Minecraft',
      'service_yandex': 'Yandex.Music',
      'service_vk': 'VK Music',
      'service_current': 'Current service',
       'profile_change_service': 'Change service',

    // Feedback
    'feedback_contact': 'Have suggestions or found a bug / want to support? Contact me on Telegram or Discord @xeenjair',
    'user_default': 'User'
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [musicService, setMusicService] = useState('yandex'); // 'yandex', 'vk' or 'soundcloud'
  const [soundcloudTracks, setSoundcloudTracks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('soundcloudTracks') || '[]');
    } catch {
      return [];
    }
  });
  const [soundcloudInput, setSoundcloudInput] = useState('');
  const [soundcloudError, setSoundcloudError] = useState('');
  const t = (key) => translations[settings.language || 'ru']?.[key] || key;
  const [playlists, setPlaylists] = useState([]);
  const [localPlaylists, setLocalPlaylists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrack, setNextTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [artistResults, setArtistResults] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistTracks, setArtistTracks] = useState([]);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  
  const [settings, setSettings] = useState({
    primaryColor: '#b3b3b3',
    backgroundColor: '#121212',
    sidebarColor: '#000000',
    cardColor: '#181818',
    accentColor: '#b3b3b3',
    enableVisualizer: false,
    enableFullscreenCover: false,
    enableSnowEffect: false,
    enableColorFromMusic: true,
    lyricsHighlightColor: '#ffdb4d',
    lyricsTextColor: '#ffffff',
    lyricsSecondaryColor: '#888888',
    language: 'ru',
    fontSize: 16,
    fontFamily: 'minecraft',
    isFullscreen: false,
    particlesType: 'none',
    enableDiscordRPC: false,
    customNickname: '',
    userColor: 'default',
    nicknameGradientDirection: '45deg',
    nicknameAnimate: false,
    nicknameAnimateDirection: 'left',
    nicknameAnimateSpeed: 4,
    nicknameBold: false,
    nicknameItalic: false,
    nicknameFont: 'default',
    nicknameGlow: false,
    nicknameGlowColor: '#ffffff',
    nicknameGlowBlur: 8,
    nicknameUppercase: false,
    nicknameLetterSpacing: 0,
    nicknameGradientColor1: '#ff6b35',
    nicknameGradientColor2: '#3742fa',
    theme: 'dark',
    avatar: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [nicknameCooldown, setNicknameCooldown] = useState({ canChange: true, remaining: 0 });
  const [dominantColor, setDominantColor] = useState(null);
  const [particles, setParticles] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    } catch {
      return [];
    }
  });
  const [favoritePlaylists, setFavoritePlaylists] = useState([]);
  const [recommendationMixes, setRecommendationMixes] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'all', 'one'
  const [toast, setToast] = useState(null);

  const nicknameStyle = useMemo(() => getNicknameStyle(settings), [settings]);

  const audioRef1 = useRef(null);
  const audioRef2 = useRef(null);
  const audioContextRef = useRef(null);
  const activeAudioRef = useRef(1);
  const currentTrackIdRef = useRef(null);
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const snowIntervalRef = useRef(null);
  const nextTrackTriggeredRef = useRef(false);
  const crossfadeIntervalRef = useRef(null);
  const scIframeRef = useRef(null);
  const scWidgetRef = useRef(null);
  const scReadyRef = useRef(false);
  const handleTrackEndRef = useRef(() => {});
  const soundCloudEndRef = useRef(() => {});

  // Загрузка сохранённого трека и громкости (БЕЗ ВРЕМЕНИ)
  useEffect(() => {
    const loadPlayerState = async () => {
      try {
        const savedState = await window.electron.player.getState();
        if (savedState) {
          setVolume(savedState.volume || 0.7);
          if (savedState.currentTrack) {
            setCurrentTrack(savedState.currentTrack);
            currentTrackIdRef.current = savedState.currentTrack.id;
            
            // Предзагружаем трек, но НЕ восстанавливаем время.
            // SoundCloud/локальные/VK треки играют НЕ через аудио-элемент — пропускаем
            const srcType = savedState.currentTrack?.source;
            if (token && srcType !== 'soundcloud' && srcType !== 'local' && srcType !== 'vk') {
              try {
                const streamData = await window.electron.yandex.getStreamUrl(token, savedState.currentTrack.id);
                audioRef1.current.src = streamData.url;
                audioRef1.current.volume = savedState.volume || 0.7;
                audioRef1.current.load();
                activeAudioRef.current = 1;
              } catch (err) {
                console.error('Failed to preload track:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load player state:', err);
      }
    };
    
    if (isAuthenticated && token) {
      loadPlayerState();
    }
  }, [isAuthenticated, token]);

  // Сохранение трека и громкости (БЕЗ ВРЕМЕНИ)
  useEffect(() => {
    const saveState = async () => {
      if (!isAuthenticated) return;
      try {
        await window.electron.player.saveState({
          currentTrack,
          volume,
          isPlaying
        });
      } catch (err) {
        console.error('Failed to save player state:', err);
      }
    };
    
    saveState();
  }, [currentTrack, volume, isAuthenticated]);

  // Сохранение при закрытии
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.electron.player.saveState({
        currentTrack,
        volume,
        isPlaying
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentTrack, volume]);

  useEffect(() => {
    checkSavedToken();
    loadSettings();
  }, []);

  // Fetch nickname cooldown when profile opens
  useEffect(() => {
    if (showProfile && window.electron?.nickname) {
      window.electron.nickname.getCooldown().then((info) => {
        if (info) setNicknameCooldown(info);
      });
    }
  }, [showProfile]);

  useEffect(() => {
    if (!window.electron?.onShortcut) return;

    const unsubscribe = window.electron.onShortcut((action) => {
      switch (action) {
        case 'playpause': togglePlayPause(); break;
        case 'next': playNext(); break;
        case 'previous': playPrevious(); break;
        case 'search': setActiveTab('search'); break;
        case 'lyrics': setActiveTab('lyrics'); break;
        case 'saveplaylist': if (tracks.length > 0) setShowCreatePlaylist(true); break;
        case 'settings': setShowSettings(true); break;
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [tracks, currentTrack, isPlaying, activeTab, searchResults]);

  // Ref-ссылки на актуальные функции управления, чтобы обработчик клавиатуры
  // всегда вызывал свежие версии (избегаем циклической инициализации)
  const togglePlayPauseRef = useRef(() => {});
  const playNextRef = useRef(() => {});
  const playPreviousRef = useRef(() => {});

  // Обновляем рефы на каждом рендере после определения функций
  useEffect(() => {
    togglePlayPauseRef.current = () => togglePlayPause();
    playNextRef.current = () => playNext();
    playPreviousRef.current = () => playPrevious();
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName;
      const isTypingField =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // Пробел — play/pause
      if (event.code === 'Space') {
        if (isTypingField) return;
        event.preventDefault();
        togglePlayPauseRef.current();
        return;
      }

      // Ctrl + → — следующий трек
      if (event.ctrlKey && event.code === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        playNextRef.current();
        return;
      }

      // Ctrl + ← — предыдущий трек
      if (event.ctrlKey && event.code === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        playPreviousRef.current();
        return;
      }

      // Мультимедийные клавиши — следующий трек
      if (event.code === 'MediaTrackNext') {
        event.preventDefault();
        event.stopPropagation();
        playNextRef.current();
        return;
      }

      // Мультимедийные клавиши — предыдущий трек
      if (event.code === 'MediaTrackPrevious') {
        event.preventDefault();
        event.stopPropagation();
        playPreviousRef.current();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // SoundCloud: применяем громкость к виджету
    if (currentTrack?.source === 'soundcloud' && scWidgetRef.current && scReadyRef.current) {
      scWidgetRef.current.setVolume(boostSoundCloudVolume(volume));
      return;
    }
    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (audio) audio.volume = volume;
  }, [volume, currentTrack]);

  // Discord RPC
  const buildDiscordActivity = useCallback((playing) => {
    if (!currentTrack) {
      return {
        details: 'Flowmusic',
        state: 'Browsing music library',
        largeImageKey: 'logo',
        largeImageText: 'Flowmusic Player'
      };
    }

    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    const current = audio && !isNaN(audio.currentTime) ? audio.currentTime : currentTime;
    const total = (audio && !isNaN(audio.duration) && audio.duration > 0)
      ? audio.duration
      : (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 0);
    const isActive = playing && total > 0;

    const activity = {
      details: `Playing: ${currentTrack.title}`,
      state: `by ${currentTrack.artists}`,
      largeImageKey: currentTrack.cover || 'logo',
      largeImageText: `${currentTrack.title} - ${currentTrack.artists}`,
      smallImageKey: isActive ? 'play' : 'pause',
      smallImageText: isActive ? 'Playing' : 'Paused'
    };

    if (isActive) {
      // Discord показывает прогресс-бар только когда заданы оба timestamp
      activity.startTimestamp = Math.floor(Date.now() / 1000) - Math.floor(current);
      activity.endTimestamp = Math.floor(Date.now() / 1000) + Math.floor(total - current);
    }

    return activity;
  }, [currentTrack, currentTime]);

  useEffect(() => {
    if (!settings.enableDiscordRPC) return;

    // Мгновенно обновляем активность при смене трека/паузы/воспроизведения
    window.electron.discord.setActivity(buildDiscordActivity(isPlaying));

    // Discord обновляет сам прогресс-бар по timestamps.
    // Переустанавливаем активность раз в 15 секунд (rate limit Discord RPC),
    // чтобы прогресс не сбрасывался.
    const interval = setInterval(() => {
      if (isPlaying && currentTrack) {
        window.electron.discord.setActivity(buildDiscordActivity(true));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [currentTrack, isPlaying, settings.enableDiscordRPC, buildDiscordActivity]);

  // При перемотке мгновенно обновляем прогресс-бар (с троттлингом 3 сек)
  const lastDiscordSeekRef = useRef(0);
  useEffect(() => {
    if (!settings.enableDiscordRPC || !isPlaying || !currentTrack) return;
    const now = Date.now();
    if (now - lastDiscordSeekRef.current < 3000) return;
    lastDiscordSeekRef.current = now;
    window.electron.discord.setActivity(buildDiscordActivity(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  useEffect(() => {
    const handleLyricsSeek = (e) => {
      const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
      if (audio && !isNaN(e.detail)) {
        audio.currentTime = e.detail;
        setCurrentTime(e.detail);
      }
    };

    window.addEventListener('lyrics:seek', handleLyricsSeek);
    return () => window.removeEventListener('lyrics:seek', handleLyricsSeek);
  }, []);

  // Стабильный геттер текущего времени аудио для LyricsView (60fps-цикл внутри компонента)
  const getCurrentTime = useCallback(() => {
    if (currentTrack?.source === 'soundcloud') {
      return currentTime;
    }
    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    return audio ? audio.currentTime : 0;
  }, [currentTrack, currentTime]);

  useEffect(() => {
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, []);

  useEffect(() => {
    if (settings.particlesType && settings.particlesType !== 'none') {
      snowIntervalRef.current = setInterval(() => {
        setParticles(prev => {
          let newParticles = prev.map(p => {
            switch (p.type) {
              case 'snow':
                return { ...p, y: p.y + p.speed, x: p.x + Math.sin(Date.now() / 1000 + p.offset) * 0.5 };
              case 'hearts':
                return { ...p, y: p.y + p.speed, x: p.x + Math.sin(Date.now() / 1000 + p.offset) * 0.3, rotation: (p.rotation || 0) + 2 };
              case 'leaves':
                return { ...p, y: p.y + p.speed, x: p.x + Math.sin(Date.now() / 1000 + p.offset) * 0.8, rotation: (p.rotation || 0) + 1 };
              case 'fireflies':
                return { ...p, y: p.y + Math.sin(Date.now() / 1000 + p.offset) * 0.5, x: p.x + Math.cos(Date.now() / 1000 + p.offset) * 0.5 };
              case 'sakura':
                return { ...p, y: p.y + p.speed, x: p.x + Math.sin(Date.now() / 1000 + p.offset) * 0.4, rotation: (p.rotation || 0) + 0.5 };
              default:
                return { ...p, y: p.y + p.speed };
            }
          }).filter(p => p.y < window.innerHeight + 50);

          const maxParticles = 30;

          while (newParticles.length < maxParticles) {
            switch (settings.particlesType) {
              case 'snow':
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  speed: 1 + Math.random() * 3,
                  offset: Math.random() * 100,
                  size: 2 + Math.random() * 4,
                  type: 'snow'
                });
                break;
              case 'hearts':
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  speed: 0.5 + Math.random() * 2,
                  offset: Math.random() * 100,
                  size: 8 + Math.random() * 8,
                  type: 'hearts',
                  rotation: Math.random() * 360
                });
                break;
              case 'leaves':
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  speed: 0.8 + Math.random() * 2,
                  offset: Math.random() * 100,
                  size: 6 + Math.random() * 6,
                  type: 'leaves',
                  rotation: Math.random() * 360
                });
                break;
              case 'fireflies':
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  speed: 0,
                  offset: Math.random() * 100,
                  size: 3 + Math.random() * 3,
                  type: 'fireflies'
                });
                break;
              case 'sakura':
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  speed: 0.3 + Math.random() * 1.5,
                  offset: Math.random() * 100,
                  size: 4 + Math.random() * 6,
                  type: 'sakura',
                  rotation: Math.random() * 360
                });
                break;
              default:
                // Placeholder for other types - use snow
                newParticles.push({
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  speed: 1 + Math.random() * 3,
                  offset: Math.random() * 100,
                  size: 2 + Math.random() * 4,
                  type: settings.particlesType
                });
                break;
            }
          }

          return newParticles;
        });
      }, 100);
    } else {
      if (snowIntervalRef.current) clearInterval(snowIntervalRef.current);
      setParticles([]);
    }
    return () => { if (snowIntervalRef.current) clearInterval(snowIntervalRef.current); };
  }, [settings.particlesType]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--bg-color', settings.backgroundColor);
    root.style.setProperty('--sidebar-color', settings.sidebarColor);
    root.style.setProperty('--card-color', settings.cardColor);
    root.style.setProperty('--accent-color', settings.accentColor);
    root.style.setProperty('--font-size', settings.fontSize + 'px');
    root.style.setProperty('--font-family', FONT_STACKS[settings.fontFamily] || settings.fontFamily || FONT_STACKS.default);
  }, [settings]);

  useEffect(() => {
    const app = document.querySelector('.app');
    if (settings.enableLiquidGlass) {
      app?.classList.add('liquid-glass');
    } else {
      app?.classList.remove('liquid-glass');
    }
  }, [settings.enableLiquidGlass]);

  useEffect(() => {
    // Remove all theme classes first
    document.body.classList.remove('light-theme', 'neon-theme', 'cyberpunk-theme', 'minimal-theme');

    // Apply selected theme (backwards compatibility with darkTheme)
    const currentTheme = settings.theme || (settings.darkTheme === false ? 'light' : 'dark');

    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
    } else if (currentTheme === 'neon') {
      document.body.classList.add('neon-theme');
    } else if (currentTheme === 'cyberpunk') {
      document.body.classList.add('cyberpunk-theme');
    } else if (currentTheme === 'minimal') {
      document.body.classList.add('minimal-theme');
    }
    // dark theme is default, no class needed
  }, [settings.theme, settings.darkTheme]);

  useEffect(() => {
    if (settings.isFullscreen) {
      // Note: Electron fullscreen API would be called here
      // For now, just set a class
      document.body.classList.add('fullscreen-mode');
    } else {
      document.body.classList.remove('fullscreen-mode');
    }
  }, [settings.isFullscreen]);

  const loadSettings = async () => {
    try {
      const saved = await window.electron.settings.get();
      if (saved) setSettings(prev => ({ ...prev, ...saved }));
    } catch (err) {}
  };

  const saveSettings = async (newSettings) => {
    const mergedSettings = { ...settings, ...newSettings };
    setSettings(mergedSettings);
    await window.electron.settings.save(mergedSettings);
  };

  const handleSelectGif = async () => {
    try {
      return await window.electron.dialog.selectGif();
    } catch (err) {
      console.error('Failed to select GIF:', err);
      return null;
    }
  };

  const handleSelectAvatar = async () => {
    try {
      const filePath = await window.electron.dialog.selectAvatar();
      if (filePath) {
        await saveSettings({ ...settings, avatar: filePath });
      }
    } catch (err) {
      console.error('Failed to select avatar:', err);
    }
  };

  const handleClearLyricsCache = async () => {
    try {
      await window.electron.lyrics.clearCache();
    } catch (err) {
      console.error('Failed to clear lyrics cache:', err);
    }
  };

  const extractColorFromImage = (imageUrl) => {
    if (!settings.enableColorFromMusic || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 40) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (count > 0) {
        setDominantColor(`rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})`);
      }
    };
  };

  const closeContextMenu = () => setContextMenu(null);

  const checkSavedToken = async () => {
    try {
      const savedToken = await window.electron.yandex.getToken();
      if (savedToken) {
        const validation = await window.electron.yandex.validateToken(savedToken);
        if (validation.valid) {
          setToken(savedToken);
          setUser(validation.user);
          setIsAuthenticated(true);
          loadPlaylists(savedToken);
          loadFavorites();
          loadLocalPlaylists();
          loadLocalTracks();
          checkSubscription();
        } else { setLoading(false); }
      } else { setLoading(false); }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try { const favs = await window.electron.favorites.get(); setFavorites(favs || []); } catch (err) {}
  };

  const loadLocalPlaylists = async () => {
    try { const locals = await window.electron.playlists.getAll(); setLocalPlaylists(locals || []); } catch (err) {}
  };

  const loadLocalTracks = async () => {
    try { const tracks = await window.electron.localTracks.getAll(); setLocalTracks(tracks || []); } catch (err) {}
  };

  const handleAddLocalTracks = async () => {
    try {
      const updated = await window.electron.localTracks.select();
      setLocalTracks(updated || []);
      showToast('Файлы добавлены!');
    } catch (err) {
      console.error('Failed to add local tracks:', err);
    }
  };

  const handleRemoveLocalTrack = async (trackId) => {
    try {
      const updated = await window.electron.localTracks.remove(trackId);
      setLocalTracks(updated || []);
      if (selectedPlaylist?.id === 'local-tracks') {
        setTracks(updated || []);
      }
    } catch (err) {}
  };

  const loadLocalTracksPlaylist = () => {
    setSelectedPlaylist({ id: 'local-tracks', name: t('sidebar_local_tracks'), type: 'local-tracks' });
    setTracks([...localTracks]);
    setActiveTab('home');
  };

  const checkSubscription = async () => {
    try {
      const result = await window.electron.subscription.status();
      setSubscriptionActive(result.active);
      setSubscriptionEndDate(result.subscription?.endDate || null);
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setSubscriptionActive(false);
    }
  };

  const loadRecommendations = async (authToken) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;
    try {
      console.log('Loading recommendations with token:', tokenToUse.substring(0, 10) + '...');
      const mixes = await window.electron.yandex.getRecommendationMixes(tokenToUse);
      console.log('Loaded recommendation mixes:', mixes);
      setRecommendationMixes(mixes || []);
    } catch (err) {
      console.error('Recommendations error:', err);
      setRecommendationMixes([]);
    }
  };

  const toggleFavoritePlaylist = (playlist) => {
    setFavoritePlaylists(prev => {
      const isFav = prev.some(p => p.id === playlist.id);
      if (isFav) {
        return prev.filter(p => p.id !== playlist.id);
      } else {
        return [...prev, playlist];
      }
    });
  };

  const toggleShuffle = () => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setTracks(shuffled);
    setIsShuffled(!isShuffled);
  };



  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const toggleRepeat = () => {
    const newMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
    setRepeatMode(newMode);

    const messages = {
      'none': t('toast_repeat_none'),
      'all': t('toast_repeat_all'),
      'one': t('toast_repeat_one')
    };
    showToast(messages[newMode]);
  };

  const loadPlaylists = async (authToken) => {
    try {
      const playlistsData = await window.electron.yandex.getPlaylists(authToken);
      setPlaylists(playlistsData || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadPlaylistTracks = async (playlistId, playlistTitle, type, ownerUid) => {
    setLoading(true);
    setSelectedPlaylist({ id: playlistId, name: playlistTitle, type: 'yandex' });
    setTracks([]); setError(null); setActiveTab('home');
    try {
      const tracksData = await window.electron.yandex.getPlaylistTracks(token, playlistId, type, ownerUid);
      setTracks(tracksData || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadMixTracks = (mix) => {
    setSelectedPlaylist({ id: String(mix.id), name: mix.title, type: 'yandex' });
    setTracks(mix.tracks || []);
    setError(null);
    setActiveTab('home');
  };

  const loadLocalPlaylist = (playlist) => {
    setSelectedPlaylist({ id: playlist.id, name: playlist.name, type: 'local' });
    setTracks(playlist.tracks || []); setActiveTab('home');
  };

  const loadFavoritesTracks = () => {
    setSelectedPlaylist({ id: 'favorites', name: 'Любимые треки', type: 'favorites' });
    setTracks(favorites); setActiveTab('home');
  };

  const loadRecentlyPlayedTracks = () => {
    setSelectedPlaylist({ id: 'recently-played', name: 'История прослушивания', type: 'recently-played' });
    setTracks(recentlyPlayed); setActiveTab('home');
  };

  const formatSearchTrack = (track) => ({
    id: track.id,
    trackId: track.id,
    title: track.title || 'Без названия',
    artists: track.artists?.map(a => a.name).join(', ') || 'Неизвестный исполнитель',
    duration: track.durationMs || 0,
    album: track.albums?.[0]?.title || 'Неизвестный альбом',
    cover: track.coverUri ? `https://${track.coverUri.replace('%%', '200x200')}` : null,
    explicit: (typeof track.contentWarning === 'string' && track.contentWarning.toLowerCase() === 'explicit')
      || track.explicit === true || track.explicit === 'explicit' || track.explicit === 1
      || track.albums?.[0]?.explicit === true || false
  });

  const formatSearchArtist = (artist) => ({
    id: artist.id,
    name: artist.name || 'Неизвестный исполнитель',
    cover: artist.cover?.uri ? `https://${artist.cover.uri.replace('%%', '200x200')}` : null,
    genres: artist.genres || [],
    various: artist.various,
    composer: artist.composer,
    available: artist.available,
    disclaimers: artist.disclaimers
  });

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSelectedArtist(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setSearchResults([]); setArtistResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (musicService === 'vk') {
          const results = await VkMusicAPI.searchTracks(query);
          setSearchResults(results || []);
          setArtistResults([]);
        } else {
          const results = await window.electron.yandex.search(token, query);
          setSearchResults((results.tracks?.results || []).map(formatSearchTrack));
          setArtistResults((results.artists?.results || []).map(formatSearchArtist));
        }
      }
      catch (err) {
        console.error('Search error:', err);
      }
      finally { setIsSearching(false); }
    }, 500);
  };

  const handleSelectArtist = async (artist) => {
    setSelectedArtist(artist);
    setIsLoadingArtist(true);
    try {
      const [details, tracks] = await Promise.all([
        window.electron.yandex.getArtistDetails(token, artist.id),
        window.electron.yandex.getArtistTracks(token, artist.id)
      ]);
      // tracks приходит как объект { tracks: [...] } от API
      const tracksList = tracks?.tracks || tracks || [];
      // details приходит сырым — форматируем
      const normalizeGenres = (g) => {
        if (!g) return [];
        return g.map(x => typeof x === 'string' ? x : x.name || x).filter(Boolean);
      };
      const formattedArtist = details ? {
        id: details.id || artist.id,
        name: details.name || artist.name,
        cover: details.cover?.uri ? `https://${details.cover.uri.replace('%%', '200x200')}` : (artist.cover || null),
        genres: normalizeGenres(details.genres || artist.genres),
        various: details.various,
        composer: details.composer,
        available: details.available,
        disclaimers: details.disclaimers
      } : artist;
      setSelectedArtist(formattedArtist);
      setArtistTracks(Array.isArray(tracksList) ? tracksList.map(formatSearchTrack) : []);
    } catch (err) {
      console.error('Artist load error:', err);
    } finally {
      setIsLoadingArtist(false);
    }
  };

  const loadAllArtistTracks = async () => {
    if (!selectedArtist) return;
    setIsLoadingArtist(true);
    try {
      const tracks = await window.electron.yandex.getArtistTracks(token, selectedArtist.id, 50);
      const tracksList = tracks?.tracks || tracks || [];
      setArtistTracks(Array.isArray(tracksList) ? tracksList.map(formatSearchTrack) : []);
    } catch (err) {
      console.error('Load all tracks error:', err);
    } finally {
      setIsLoadingArtist(false);
    }
  };

  const toggleFavorite = async (track) => {
    const isFav = favorites.some(t => t.id === track.id);
    let updated;
    if (isFav) updated = await window.electron.favorites.remove(track.id);
    else updated = await window.electron.favorites.add(track);
    setFavorites(updated);
    if (selectedPlaylist?.type === 'favorites') setTracks(updated);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = await window.electron.playlists.create(newPlaylistName);
    setLocalPlaylists([...localPlaylists, newPlaylist]);
    setNewPlaylistName(''); setShowCreatePlaylist(false);
  };

  const deletePlaylist = async (playlistId) => {
    if (window.confirm('Удалить плейлист?')) {
      const updated = await window.electron.playlists.delete(playlistId);
      setLocalPlaylists(updated);
      if (selectedPlaylist?.id === playlistId) { setTracks([]); setSelectedPlaylist(null); }
    }
  };

  const addToPlaylist = async (playlistId, track) => {
    await window.electron.playlists.addTrack(playlistId, track);
    await loadLocalPlaylists();
    showToast(`Трек "${track.title}" добавлен в плейлист!`);
  };

  const removeFromPlaylist = async (playlistId, trackId) => {
    await window.electron.playlists.removeTrack(playlistId, trackId);
    await loadLocalPlaylists();
    if (selectedPlaylist?.id === playlistId) {
      const playlist = localPlaylists.find(p => p.id === playlistId);
      if (playlist) setTracks(playlist.tracks);
    }
  };

  const handleContextMenu = (e, track) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, track });
  };

  const cleanupAudio = () => {
    if (audioRef1.current) {
      audioRef1.current.pause();
      audioRef1.current.src = '';
      audioRef1.current.load();
      audioRef1.current.oncanplay = null;
      audioRef1.current.onerror = null;
    }
    if (audioRef2.current) {
      audioRef2.current.pause();
      audioRef2.current.src = '';
      audioRef2.current.load();
      audioRef2.current.oncanplay = null;
      audioRef2.current.onerror = null;
    }
  };

  const stopCrossfade = () => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    setIsCrossfading(false);
    setNextTrack(null);
  };

  const crossfadeToTrack = async (track) => {
    if (isCrossfading) stopCrossfade();
    
    setIsCrossfading(true);
    setNextTrack(track);
    
    const currentAudio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    const nextAudio = activeAudioRef.current === 1 ? audioRef2.current : audioRef1.current;
    
    try {
      const streamData = await window.electron.yandex.getStreamUrl(token, track.id);
      nextAudio.src = streamData.url;
      nextAudio.volume = 0;
      nextAudio.currentTime = 0;
      await nextAudio.play();
      
      const fadeSteps = 50;
      const fadeTime = (settings.crossfade || 3) * 1000;
      const stepTime = fadeTime / fadeSteps;
      let step = 0;
      
      crossfadeIntervalRef.current = setInterval(() => {
        step++;
        if (currentAudio) currentAudio.volume = Math.max(0, volume * (1 - step / fadeSteps));
        nextAudio.volume = Math.min(volume, volume * (step / fadeSteps));
        
        if (step >= fadeSteps) {
          clearInterval(crossfadeIntervalRef.current);
          crossfadeIntervalRef.current = null;
          if (currentAudio) { currentAudio.pause(); currentAudio.volume = volume; }
          activeAudioRef.current = activeAudioRef.current === 1 ? 2 : 1;
          setCurrentTrack(track);
          currentTrackIdRef.current = track.id;
          setIsPlaying(true);
          setIsCrossfading(false);
          setNextTrack(null);
          nextTrackTriggeredRef.current = false;
          setCurrentTime(0);
          extractColorFromImage(track.cover);
        }
      }, stepTime);
    } catch (err) {
      console.error('Crossfade error:', err);
      stopCrossfade();
      setCurrentTrack(track);
      playTrack(track);
    }
  };

  const playTrack = async (track) => {
    if (track.source === 'soundcloud') {
      playSoundCloudTrack(track);
      return;
    }

    if (!token && track.source !== 'local') { setError('Нет токена авторизации'); return; }

    if (currentTrack?.id === track.id && !isCrossfading) {
      const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
      if (audio) {
        if (isPlaying) { audio.pause(); setIsPlaying(false); }
        else {
          if (!audio.src || audio.src === window.location.href) {
            await loadTrackAudio(track);
          } else {
            audio.play();
            setIsPlaying(true);
          }
        }
      }
      return;
    }

    // Add to recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const newList = [track, ...filtered].slice(0, 10);
      localStorage.setItem('recentlyPlayed', JSON.stringify(newList));
      return newList;
    });
    
    if (isLoadingRef.current) {
      isLoadingRef.current = false;
    }
    
    stopCrossfade();
    nextTrackTriggeredRef.current = false;
    isLoadingRef.current = true;
    setIsLoadingTrack(true);
    setError(null);
    
    cleanupAudio();
    
    setCurrentTrack(track);
    currentTrackIdRef.current = track.id;
    setCurrentTime(0);
    setDuration(track.duration / 1000 || 0);
    setIsPlaying(false);
    activeAudioRef.current = 1;
    
    try {
      let streamUrl;
      if (track.source === 'local') {
        streamUrl = 'file:///' + track.filePath.replace(/\\/g, '/');
      } else if (track.source === 'vk') {
        streamUrl = track.streamUrl || VkMusicAPI.getStreamUrl(track);
      } else {
        const streamData = await window.electron.yandex.getStreamUrl(token, track.id);
        streamUrl = streamData.url;
      }

      if (currentTrackIdRef.current !== track.id) {
        isLoadingRef.current = false;
        setIsLoadingTrack(false);
        return;
      }

      audioRef1.current.src = streamUrl;
      audioRef1.current.volume = volume;
      audioRef1.current.currentTime = 0;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
        audioRef1.current.oncanplay = () => { clearTimeout(timeout); resolve(); };
        audioRef1.current.onerror = () => { clearTimeout(timeout); reject(new Error('Audio error')); };
        audioRef1.current.load();
      });
      
      if (currentTrackIdRef.current !== track.id) {
        isLoadingRef.current = false;
        setIsLoadingTrack(false);
        return;
      }
      
      await audioRef1.current.play();
      
      if (currentTrackIdRef.current === track.id) {
        setIsPlaying(true);
        extractColorFromImage(track.cover);
        setIsLoadingTrack(false);
        isLoadingRef.current = false;
      }
    } catch (err) {
      console.error('Play error:', err);
      if (currentTrackIdRef.current === track.id) {
        setError(err.message === 'Timeout' ? 'Таймаут загрузки' : 'Ошибка воспроизведения');
        setIsLoadingTrack(false);
      }
      isLoadingRef.current = false;
    }
  };

  const playSoundCloudTrack = (track) => {
    if (!track?.url) return;

    if (currentTrack?.id === track.id) {
      // Если тот же трек — переключаем play/pause
      togglePlayPause();
      return;
    }

    setCurrentTrack(track);
    currentTrackIdRef.current = track.id;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoadingTrack(true);
    setError(null);

    const iframe = scIframeRef.current;
    const widget = scWidgetRef.current;

    // По завершении трека — играем следующий
    soundCloudEndRef.current = () => {
      const list = tracks.length > 0 ? tracks : searchResults;
      const idx = list.findIndex(t => t.id === track.id);
      const next = idx !== -1 ? list[idx + 1] : null;
      if (next) {
        playTrack(next);
      } else {
        setIsPlaying(false);
      }
    };

    const loadIntoWidget = (w) => {
      w.load(track.url, {
        auto_play: true,
        visual: false,
        show_artwork: false,
        hide_related: true,
        show_comments: false,
        show_user: false,
        show_reposts: false,
        show_teaser: false,
        download: false,
        sharing: false,
        buying: false
      });
      w.bind(window.SC.Widget.Events.READY, () => {
        scReadyRef.current = true;
        w.setVolume(boostSoundCloudVolume(volume));
      });
      w.bind(window.SC.Widget.Events.PLAY, () => {
        setIsLoadingTrack(false);
        setIsPlaying(true);
      });
      w.bind(window.SC.Widget.Events.PAUSE, () => {
        setIsPlaying(false);
      });
      w.bind(window.SC.Widget.Events.FINISH, () => {
        soundCloudEndRef.current();
      });
      w.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        if (data && !isNaN(data.currentPosition)) {
          setCurrentTime(data.currentPosition / 1000);
          if (!duration && data.duration) setDuration(data.duration / 1000);
        }
      });
      setTimeout(() => w.play(), 300);
    };

    if (!iframe) {
      console.error('SoundCloud iframe ещё не загружен');
      setIsLoadingTrack(false);
      return;
    }

    if (scWidgetRef.current) {
      loadIntoWidget(scWidgetRef.current);
    } else {
      initSoundCloudWidget();
      // retry после инициализации
      setTimeout(() => {
        if (scWidgetRef.current) {
          loadIntoWidget(scWidgetRef.current);
        } else {
          console.error('Не удалось инициализировать SoundCloud виджет');
          setIsLoadingTrack(false);
        }
      }, 800);
    }
  };

  const loadTrackAudio = async (track) => {
    try {
      const streamData = await window.electron.yandex.getStreamUrl(token, track.id);
      audioRef1.current.src = streamData.url;
      audioRef1.current.volume = volume;
      audioRef1.current.currentTime = 0;
      
      await new Promise((resolve) => {
        audioRef1.current.oncanplay = resolve;
        audioRef1.current.load();
      });
      
      await audioRef1.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Load audio error:', err);
    }
  };

  const togglePlayPause = () => {
    // SoundCloud: управляем через Widget API
    if (currentTrack?.source === 'soundcloud') {
      const widget = scWidgetRef.current;
      if (widget) {
        if (isPlaying) {
          widget.pause();
          setIsPlaying(false);
        } else {
          widget.play();
          setIsPlaying(true);
        }
      }
      return;
    }

    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    
    if (!currentTrack) {
      const currentList = activeTab === 'search' ? searchResults : tracks;
      if (currentList.length > 0) {
        playTrack(currentList[0]);
      }
      return;
    }
    
    if (!audio) return;
    
    if (!audio.src || audio.src === window.location.href) {
      playTrack(currentTrack);
      return;
    }
    
    if (isPlaying) { 
      audio.pause(); 
      setIsPlaying(false); 
    } else { 
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(err => {
          console.error('Play error:', err);
          playTrack(currentTrack);
        }); 
      }
    }
  };

  const handleTrackEnd = () => {
    if (nextTrackTriggeredRef.current) return;
    nextTrackTriggeredRef.current = true;

    if (repeatMode === 'one') {
      // Repeat current track
      const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
        nextTrackTriggeredRef.current = false;
        return;
      }
    }

    const currentList = activeTab === 'search' ? searchResults : tracks;
    if (!currentTrack || currentList.length === 0) {
      // For favorites, repeat from start; for search/other, stop
      if (selectedPlaylist?.type === 'favorites') {
        playTrack(currentList[0]);
      }
      nextTrackTriggeredRef.current = false;
      return;
    }

    const idx = currentList.findIndex(t => t.id === currentTrack.id);
    if (idx === -1) {
      nextTrackTriggeredRef.current = false;
      return;
    }

    // Determine if we should repeat based on source
    const shouldRepeat = selectedPlaylist?.type === 'favorites';
    const nextTrackData = idx < currentList.length - 1 ? currentList[idx + 1] : (shouldRepeat ? currentList[0] : null);

    if (nextTrackData) {
      if ((settings.crossfade || 0) > 0 && isPlaying) {
        crossfadeToTrack(nextTrackData);
      } else {
        playTrack(nextTrackData);
      }
    } else {
      // End of playlist: repeat for favorites, stop for others
      if (shouldRepeat) {
        playTrack(currentList[0]);
      } else {
        setIsPlaying(false);
        nextTrackTriggeredRef.current = false;
      }
    }
  };

  const playNext = () => {
    if (nextTrackTriggeredRef.current) return;
    nextTrackTriggeredRef.current = true;

    const currentList = activeTab === 'search' ? searchResults : tracks;

    if (currentList.length === 0) {
      nextTrackTriggeredRef.current = false;
      return;
    }

    if (!currentTrack) {
      playTrack(currentList[0]);
      nextTrackTriggeredRef.current = false;
      return;
    }

    const idx = currentList.findIndex(t => t.id === currentTrack.id);

    if (idx === -1) {
      playTrack(currentList[0]);
      nextTrackTriggeredRef.current = false;
      return;
    }

    // Determine if we should repeat based on source
    const shouldRepeat = selectedPlaylist?.type === 'favorites';
    const nextTrackData = idx < currentList.length - 1 ? currentList[idx + 1] : (shouldRepeat ? currentList[0] : null);

    if (nextTrackData) {
      if ((settings.crossfade || 0) > 0 && isPlaying) {
        crossfadeToTrack(nextTrackData);
      } else {
        playTrack(nextTrackData);
      }
    } else {
      // End of playlist: repeat for favorites, stop for others
      if (shouldRepeat) {
        playTrack(currentList[0]);
      } else {
        setIsPlaying(false);
        nextTrackTriggeredRef.current = false;
      }
    }
  };

  const playPrevious = () => {
    const currentList = activeTab === 'search' ? searchResults : tracks;
    
    if (currentList.length === 0) return;
    
    if (!currentTrack) {
      playTrack(currentList[0]);
      return;
    }
    
    const idx = currentList.findIndex(t => t.id === currentTrack.id);
    
    if (idx === -1) {
      playTrack(currentList[0]);
      return;
    }
    
    const prevTrackData = idx > 0 ? currentList[idx - 1] : currentList[currentList.length - 1];
    playTrack(prevTrackData);
  };

  const handleTimeUpdate = () => {
    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (audio) setDuration(audio.duration);
  };


  const handleLyricsSeek = (position) => {
    console.log('Lyrics seeking to position:', position);
    if (currentTrack?.source === 'soundcloud') {
      const widget = scWidgetRef.current;
      if (widget && !isNaN(position)) {
        widget.seekTo(position * 1000);
        setCurrentTime(position);
      }
      return;
    }
    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
    if (audio && !isNaN(position)) { audio.currentTime = position; setCurrentTime(position); }
  };

  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = 1 - (e.clientY - rect.top) / rect.height;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (providedToken) => {
    const tokenToUse = providedToken || document.getElementById('tokenInput')?.value;
    if (!tokenToUse) return;
    setLoading(true);
    try {
      const validation = await window.electron.yandex.validateToken(tokenToUse);
      if (validation.valid) {
        setToken(tokenToUse); setUser(validation.user); setIsAuthenticated(true);
        await window.electron.yandex.saveToken(tokenToUse);
        loadPlaylists(tokenToUse); loadFavorites(); loadLocalPlaylists(); loadLocalTracks(); loadRecommendations(tokenToUse);
        checkSubscription();
      } else { setError(t('auth_error_generic')); setLoading(false); }
    } catch (err) { setError(err.message); setLoading(false); }
  };



  useEffect(() => {
    if (!settings.showNotifications || !currentTrack?.title) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('Сейчас играет', {
        body: `${currentTrack.title} — ${currentTrack.artists || 'Неизвестный исполнитель'}`
      });
    }
  }, [currentTrack?.id, settings.showNotifications]);

  const handleLogout = () => {
    stopCrossfade();
    cleanupAudio();
    window.electron.yandex.saveToken(null);
    setIsAuthenticated(false); setToken(null); setUser(null); setPlaylists([]); setLocalPlaylists([]);
    setFavorites([]); setTracks([]); setCurrentTrack(null); setIsPlaying(false);
    setMusicService('yandex');
  };

  // ============ SoundCloud (виджет, без API-ключа и подписки) ============

  // Загрузка player.js SoundCloud Widget API (глобальный SC)
  const loadSoundCloudWidgetAPI = () => {
    if (window.SC) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Не удалось загрузить SoundCloud Widget API'));
      document.head.appendChild(script);
    });
  };

  // Инициализация виджета, когда появился iframe
  useEffect(() => {
    if (selectedPlaylist?.type === 'soundcloud' && scIframeRef.current) {
      initSoundCloudWidget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaylist?.type]);

  // Инициализация виджета
  const initSoundCloudWidget = () => {
    const iframe = scIframeRef.current;
    if (!iframe) return null;
    loadSoundCloudWidgetAPI()
      .then(() => {
        scWidgetRef.current = window.SC.Widget(iframe);

        scWidgetRef.current.bind(window.SC.Widget.Events.READY, () => {
          scReadyRef.current = true;
          scWidgetRef.current.setVolume(boostSoundCloudVolume(volume));

          // Слушаем окончание трека
          scWidgetRef.current.bind(window.SC.Widget.Events.FINISH, () => {
            soundCloudEndRef.current();
          });

          // Обновляем прогресс
          scWidgetRef.current.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
            if (data && !isNaN(data.currentPosition)) {
              setCurrentTime(data.currentPosition / 1000);
            }
          });

          if (isPlaying) {
            scWidgetRef.current.play();
          }
        });
      })
      .catch((err) => {
        console.error('SoundCloud widget init error:', err);
        setSoundcloudError('Не удалось загрузить SoundCloud плеер');
        setIsLoadingTrack(false);
      });
    return scWidgetRef.current;
  };

  // Генерация стабильного id для трека
  const soundcloudTrackId = (url) => {
    const path = SoundCloud.extractPath(url);
    return 'sc_' + (path ? path.replace(/[^a-zA-Z0-9]/g, '_') : btoa(url).slice(0, 16));
  };

  const handleSoundcloudLogin = async () => {
    const url = soundcloudInput.trim();
    setSoundcloudError('');
    if (!url) {
      setSoundcloudError('Вставьте ссылку на трек или плейлист SoundCloud');
      return;
    }

    try {
      const info = await SoundCloud.fetchTrackInfo(url);
      const track = {
        id: soundcloudTrackId(url),
        title: info.title,
        artists: info.artists,
        album: 'SoundCloud',
        duration: 0,
        durationMs: 0,
        cover: info.cover,
        url: url.trim(),
        source: 'soundcloud',
        addedAt: Date.now()
      };

      setSoundcloudTracks(prev => {
        const exists = prev.some(t => t.id === track.id);
        if (exists) return prev;
        const updated = [...prev, track];
        localStorage.setItem('soundcloudTracks', JSON.stringify(updated));
        return updated;
      });

      setIsAuthenticated(true);
      setUser({ login: 'SoundCloud', name: 'SoundCloud' });
      loadSoundcloudPlaylist();
      setSoundcloudInput('');
      showToast('Трек SoundCloud добавлен!');
    } catch (err) {
      setSoundcloudError(err.message || 'Ошибка добавления трека');
    }
  };

  const loadSoundcloudPlaylist = () => {
    setSelectedPlaylist({ id: 'soundcloud', name: 'SoundCloud', type: 'soundcloud' });
    const list = soundcloudTracks.length > 0 ? [...soundcloudTracks] : 
      (() => {
        try { return JSON.parse(localStorage.getItem('soundcloudTracks') || '[]'); } catch { return []; }
      })();
    setTracks(list);
    setActiveTab('home');
    setLoading(false);
  };

  const removeSoundcloudTrack = (trackId) => {
    setSoundcloudTracks(prev => {
      const updated = prev.filter(t => t.id !== trackId);
      localStorage.setItem('soundcloudTracks', JSON.stringify(updated));
      if (selectedPlaylist?.id === 'soundcloud') setTracks(updated);
      return updated;
    });
  };

  const handleVkLogin = async (vkToken) => {
    setLoading(true);
    try {
      VkMusicAPI.setToken(vkToken);
      const isConnected = await VkMusicAPI.testConnection();
      if (!isConnected) {
        throw new Error('VK token invalid or expired');
      }
      const userInfo = await VkMusicAPI.getUserInfo();
      setIsAuthenticated(true);
      setToken(vkToken);
      setUser({ name: `${userInfo.first_name} ${userInfo.last_name}`, login: userInfo.first_name, service: 'vk', vkId: userInfo.id });
      
      // Load VK music
      const myTracks = await VkMusicAPI.getMyMusic(50);
      setTracks(myTracks);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'VK connection failed');
      setLoading(false);
    }
  };

  const isFavorite = (trackId) => favorites.some(t => t.id === trackId);
  const displayTracks = activeTab === 'search' ? (selectedArtist ? artistTracks : searchResults) : tracks;
  const displayTitle = activeTab === 'search'
    ? (selectedArtist ? selectedArtist.name : `Результаты поиска "${searchQuery}"`)
    : selectedPlaylist?.name || 'Выберите плейлист';

  if (!isAuthenticated) {
    return (
      <div className="app" style={{ background: settings.backgroundColor }}>
        <Titlebar />
        <div className="service-selection">
          <div className="service-buttons">
            <button
              className={`service-btn ${musicService === 'yandex' ? 'active' : ''}`}
              onClick={() => setMusicService('yandex')}
            >
              <span className="service-icon">🎵</span>
              <span>{t('service_yandex')}</span>
            </button>
            <button
              className={`service-btn ${musicService === 'vk' ? 'active' : ''}`}
              onClick={() => setMusicService('vk')}
            >
              <span className="service-icon">🎶</span>
              <span>{t('service_vk')}</span>
            </button>
            <button
              className={`service-btn ${musicService === 'soundcloud' ? 'active' : ''}`}
              onClick={() => setMusicService('soundcloud')}
            >
              <span className="service-icon">☁️</span>
              <span>SoundCloud</span>
            </button>
          </div>

        {musicService === 'yandex' ? (
          <YandexAuth
            onAuth={handleLogin}
            loading={loading}
            error={error}
            language={settings.language || 'ru'}
          />
        ) : musicService === 'soundcloud' ? (
          <div className="soundcloud-auth">
            <div className="auth-card soundcloud-auth-card">
              <h2 className="auth-title">
                <span className="auth-logo">☁️</span>
                SoundCloud
              </h2>
              <p className="soundcloud-auth-desc">
                Добавьте треки SoundCloud бесплатно — без токенов, регистрации и подписки
              </p>
              <div className="soundcloud-input-wrap">
                <input
                  type="url"
                  className="search-input soundcloud-input"
                  placeholder="https://soundcloud.com/артист/трек"
                  value={soundcloudInput}
                  onChange={(e) => setSoundcloudInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSoundcloudLogin();
                    }
                  }}
                />
                <button className="soundcloud-add-btn" onClick={handleSoundcloudLogin}>
                  Добавить
                </button>
              </div>
              {soundcloudError && <div className="error-state soundcloud-error"><span className="error-icon">⚠️</span><p>{soundcloudError}</p></div>}
              <p className="soundcloud-tracks-count">
                {soundcloudTracks.length > 0
                  ? `Добавлено треков: ${soundcloudTracks.length}`
                  : 'Вставьте ссылку на любой публичный трек или плейлист SoundCloud'}
              </p>
              {soundcloudTracks.length > 0 && (
                <button className="soundcloud-continue-btn" onClick={loadSoundcloudPlaylist}>
                  ▶ Продолжить
                </button>
              )}
            </div>
          </div>
        ) : (
          <VkAuth
            onAuth={handleVkLogin}
            loading={loading}
            error={error}
            language={settings.language || 'ru'}
          />
        )}
      </div>
      </div>
    );
  }

  // Обложка трека на фоне: только в режиме Lyrics и когда GIF-фон выключен
  const showFullscreenCover = !settings.enableGifBackground && settings.enableFullscreenCover && currentTrack?.cover && activeTab === 'lyrics';

  return (
    <div
      className="app"
      style={{
        background: (settings.enableGifBackground || showFullscreenCover)
          ? 'transparent'
          : settings.backgroundColor
      }}
      onClick={closeContextMenu}
    >
      <Titlebar />
      <audio ref={audioRef1} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleTrackEnd} crossOrigin="anonymous" />
      <audio ref={audioRef2} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleTrackEnd} crossOrigin="anonymous" />
      
      {/* SoundCloud iframe (скрытый) для воспроизведения через Widget API */}
      {selectedPlaylist?.type === 'soundcloud' && (
        <iframe
          ref={scIframeRef}
          title="SoundCloud"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudTracks[0]?.url || 'https://soundcloud.com/-')}&auto_play=false&visual=false&show_artwork=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&download=false&sharing=false&buying=false`}
          style={{ display: 'none' }}
          allow="autoplay"
        />
      )}
      
      {settings.enableGifBackground && settings.gifPath && (
        <img 
          src={settings.gifPath}
          className="gif-background"
          style={{ 
            opacity: settings.gifOpacity || 0.3,
            filter: `blur(${settings.gifBlur || 0}px)`
          }}
          alt=""
        />
      )}
      
      {particles.map((p, i) => (
        <div
          key={i}
          className={`particle particle-${p.type}`}
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
            transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
            opacity: 0.8
          }}
        />
      ))}
      
      {showFullscreenCover && (
        <div className="fullscreen-cover" style={{ backgroundImage: `url(${currentTrack.cover})` }}>
          <div className="fullscreen-cover-overlay" />
        </div>
      )}
      
      {activeTab !== 'lyrics' && (
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ background: settings.sidebarColor }}>
          <div className="sidebar-header">
            <div className="logo">
              <NoteIcon className="logo-icon" size={20} />
              <span className="logo-text">flowmusic</span>
            </div>
          </div>
          

          
          <div className="playlists-section">
            <div className="playlists-header-with-action">
              <h3 className="playlists-title">{t('sidebar_mymedia')}</h3>
              <button className="create-playlist-btn" onClick={() => setShowCreatePlaylist(true)}>
                <AddIcon size={20} />
              </button>
            </div>
            <div className="playlists-list">
              <div className={`playlist-item ${selectedPlaylist?.type === 'favorites' ? 'active' : ''}`} onClick={loadFavoritesTracks}>
                <HeartIcon className="playlist-icon" size={20} filled />
                <div className="playlist-info">
                  <div className="playlist-name">{t('sidebar_favorites')}</div>
                  <div className="playlist-meta">{favorites.length} {t('main_playlist_tracks')}</div>
                </div>
                {selectedPlaylist?.type === 'favorites' && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
              </div>
              <div className={`playlist-item ${selectedPlaylist?.type === 'recently-played' ? 'active' : ''}`} onClick={loadRecentlyPlayedTracks}>
                <HistoryIcon className="playlist-icon" size={20} />
                <div className="playlist-info">
                  <div className="playlist-name">{t('sidebar_history')}</div>
                  <div className="playlist-meta">{recentlyPlayed.length} {t('main_playlist_tracks')}</div>
                </div>
                {selectedPlaylist?.type === 'recently-played' && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
              </div>
              <div className={`playlist-item ${selectedPlaylist?.id === 'local-tracks' ? 'active' : ''}`} onClick={loadLocalTracksPlaylist}>
                <NoteIcon className="playlist-icon" size={20} />
                <div className="playlist-info">
                  <div className="playlist-name">{t('sidebar_local_tracks')}</div>
                  <div className="playlist-meta">{localTracks.length} {t('main_playlist_tracks')}</div>
                </div>
                <div className="playlist-actions">
                  <button className="playlist-action-btn" onClick={(e) => { e.stopPropagation(); handleAddLocalTracks(); }} title={t('sidebar_add_tracks')}>
                    <AddIcon size={16} />
                  </button>
                </div>
                {selectedPlaylist?.id === 'local-tracks' && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
              </div>
              <div className={`playlist-item ${selectedPlaylist?.type === 'soundcloud' ? 'active' : ''}`} onClick={loadSoundcloudPlaylist}>
                <span className="soundcloud-sidebar-icon">☁️</span>
                <div className="playlist-info">
                  <div className="playlist-name">SoundCloud</div>
                  <div className="playlist-meta">{soundcloudTracks.length} {t('main_playlist_tracks')}</div>
                </div>
                {selectedPlaylist?.type === 'soundcloud' && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
              </div>
            </div>
            
            <div className="playlists-list">
              {playlists.filter(pl =>
                !pl.title.toLowerCase().includes('премьера') &&
                !pl.title.toLowerCase().includes('дежавю') &&
                !pl.title.toLowerCase().includes('премьер') &&
                !pl.title.toLowerCase().includes('дежа')
              ).map(pl => (
                <div key={pl.id} className={`playlist-item ${selectedPlaylist?.name === pl.title && selectedPlaylist?.type === 'yandex' ? 'active' : ''}`} onClick={() => loadPlaylistTracks(pl.id, pl.title, pl.type, pl.ownerUid)}>
                  {pl.cover && <img src={pl.cover} alt={pl.title} className="playlist-cover" />}
                  <div className="playlist-info">
                    <div className="playlist-name">{pl.title}</div>
                    <div className="playlist-meta">{pl.trackCount} {t('main_track_count')}</div>
                  </div>
                  <div className="playlist-actions">
                    <button className="playlist-action-btn" onClick={(e) => { e.stopPropagation(); toggleFavoritePlaylist(pl); }}>
                      <HeartIcon size={16} filled={favoritePlaylists.some(fp => fp.id === pl.id)} />
                    </button>
                  </div>
                  {selectedPlaylist?.name === pl.title && selectedPlaylist?.type === 'yandex' && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
                </div>
              ))}
            </div>
            
            <h3 className="playlists-title" style={{ marginTop: '16px' }}>{t('sidebar_my_playlists')}</h3>
            <div className="playlists-list">
              {localPlaylists.map(pl => (
                <div key={pl.id} className={`playlist-item ${selectedPlaylist?.id === pl.id ? 'active' : ''}`} onClick={() => loadLocalPlaylist(pl)}>
                  <PlaylistIcon className="playlist-icon" size={20} />
                  <div className="playlist-info">
                    <div className="playlist-name">{pl.name}</div>
                    <div className="playlist-meta">{pl.tracks?.length || 0} треков</div>
                  </div>
                  <div className="playlist-actions">
                    <button className="playlist-action-btn" onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}>
                      <DeleteIcon size={16} />
                    </button>
                  </div>
                  {selectedPlaylist?.id === pl.id && <motion.span layoutId="sidebar-pill" className="sidebar-pill" />}
                </div>
              ))}
            </div>

          </div>

          <div className="sidebar-footer">
            <div className="user-info" onClick={() => setShowProfile(true)}>
              {settings.avatar ? (
                <img src={avatarSrc(settings.avatar)} alt="" className="user-avatar user-avatar-img" />
              ) : (
                <div className="user-avatar">👤</div>
              )}
              <div className="user-name">
                <span style={nicknameStyle.style} className={nicknameStyle.className}>
                  {settings.customNickname || user?.login || 'Пользователь'}
                </span>
              </div>
            </div>
            <div className="settings-btn" onClick={() => setShowSettings(true)}>
              <SettingsIcon size={18} />
              <span>{t('settings_title')}</span>
            </div>
          </div>

          <div className="sidebar-feedback">
            <div className="feedback-text">
              {t('feedback_contact')}
            </div>
          </div>

          <button
            className={`premium-badge-btn ${subscriptionActive ? 'active' : ''}`}
            onClick={() => setShowSubscriptionModal(true)}
          >
            <span className="premium-crown-icon">
              {subscriptionActive ? '✅' : '👑'}
            </span>
            <span className="premium-label">
              {subscriptionActive ? 'Premium активно' : 'FlowMusic Premium'}
            </span>
            <span className="premium-btn-arrow">99₽</span>
          </button>
        </div>
      )}
      
      <div className={`main-content ${activeTab === 'lyrics' ? 'fullscreen' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activeTab !== 'lyrics' && (
          <div className="top-nav-bar">
          <div className="top-nav-left">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <span className="toggle-icon">{sidebarCollapsed ? <PrevIcon size={16} /> : <CloseIcon size={16} />}</span>
            </button>
            {activeTab !== 'home' && (
              <button className="back-btn" onClick={() => { setActiveTab('home'); setSelectedPlaylist(null); setTracks([]); }}>
                <PrevIcon size={16} />
                <span>{t('nav_back')}</span>
              </button>
            )}
          </div>
            <div className="top-nav-center">
              <motion.button
                layout
                className={`top-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTab('home')}
                whileTap={{ scale: 0.95 }}
              >
                <HomeIcon className="top-nav-icon" size={20} />
                <span>{t('nav_home')}</span>
                {activeTab === 'home' && <motion.span layoutId="nav-pill" className="nav-pill" />}
              </motion.button>
              <motion.button
                layout
                className={`top-nav-item ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
                whileTap={{ scale: 0.95 }}
              >
                <SearchIcon className="top-nav-icon" size={20} />
                <span>{t('nav_search')}</span>
                {activeTab === 'search' && <motion.span layoutId="nav-pill" className="nav-pill" />}
              </motion.button>
              <motion.button
                layout
                className={`top-nav-item ${activeTab === 'lyrics' ? 'active' : ''}`}
                onClick={() => setActiveTab('lyrics')}
                whileTap={{ scale: 0.95 }}
              >
                <LyricsIcon className="top-nav-icon" size={20} />
                <span>{t('nav_lyrics')}</span>
                {activeTab === 'lyrics' && <motion.span layoutId="nav-pill" className="nav-pill" />}
              </motion.button>
            </div>
            <div className="top-nav-right"></div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab === 'search' && selectedArtist ? 'artist' : `${activeTab}-${selectedPlaylist?.id || selectedPlaylist?.type || 'default'}`}
            className="content-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
          {activeTab === 'search' && (
            <div className="search-container">
              <div className="search-header"><h2>{t('nav_search')}</h2></div>
              <div className="search-input-wrapper">
                <SearchIcon className="search-icon-svg" size={18} />
                <input type="text" className="search-input" placeholder={t('main_search_placeholder')} value={searchQuery} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                {searchQuery && (
                  <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setArtistResults([]); setSelectedArtist(null); }}>
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>

              {selectedArtist ? (
                <div className="artist-profile">
                  <button className="back-btn" onClick={() => setSelectedArtist(null)} style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                    <PrevIcon size={16} />
                    <span>{t('nav_back')}</span>
                  </button>
                  <div className="artist-profile-header">
                    {selectedArtist.cover ? (
                      <img src={selectedArtist.cover} alt={selectedArtist.name} className="artist-profile-cover" />
                    ) : (
                      <div className="artist-profile-cover-placeholder">
                        <span>🎤</span>
                      </div>
                    )}
                    <div className="artist-profile-info">
                      <h1 className="artist-profile-name">{selectedArtist.name}</h1>
                      {selectedArtist.genres && selectedArtist.genres.length > 0 && (
                        <div className="artist-genres">
                          {selectedArtist.genres.map((genre, i) => (
                            <span key={i} className="artist-genre-tag">{genre}</span>
                          ))}
                        </div>
                      )}
                      <p className="artist-track-count">{artistTracks.length} {t('main_playlist_tracks')}
                        {artistTracks.length > 0 && artistTracks.length < 50 && (
                          <button className="show-all-tracks-btn" onClick={loadAllArtistTracks}>
                            {t('main_show_all_tracks') || 'Все треки'}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {isLoadingArtist ? (
                    <div className="loading-state"><div className="spinner"></div><p>{t('main_loading')}</p></div>
                  ) : (
                    <div className="tracks-list" style={{ width: '100%' }}>
                      <div className="tracks-header">
                        <div className="track-number">#</div>
                        <div className="track-title-header">{t('main_track_title_header')}</div>
                        <div className="track-album">{t('main_album_header')}</div>
                        <div className="track-duration"><TimeIcon size={18} /></div>
                      </div>
                      {artistTracks.map((track, idx) => (
                        <div key={track.id} className={`track-item ${currentTrack?.id === track.id ? 'playing' : ''} ${nextTrack?.id === track.id ? 'next' : ''}`}
                          style={{ animationDelay: `${Math.min(idx * 0.04, 1)}s` }}
                          onClick={() => playTrack(track)}
                          onContextMenu={(e) => handleContextMenu(e, track)}
                        >
                          <div className="track-number">
                            {currentTrack?.id === track.id && isLoadingTrack ? '⏳' : currentTrack?.id === track.id && isPlaying ? <SpeakerIcon size={18} /> : nextTrack?.id === track.id ? '⏭' : idx + 1}
                          </div>
                          <div className="track-info">
                            {track.cover && <img src={track.cover} alt={track.title} className="track-cover" />}
                            <div className="track-details">
                              <div className="track-title">
                                {track.title}
                                {track.explicit && <span className="explicit-badge">E</span>}
                              </div>
                              <div className="track-artist">{track.artists}</div>
                            </div>
                          </div>
                          <div className="track-album">{track.album}</div>
                          <div className="track-duration">
                            <button className={`favorite-btn ${isFavorite(track.id) ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}
                            >
                              <HeartIcon filled={isFavorite(track.id)} size={18} />
                            </button>
                            <span>{formatTime(track.duration / 1000)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {artistResults.length > 0 && (
                    <div className="artist-results">
                      <h3 className="artist-results-title">{t('main_artist_results')}</h3>
                      <div className="artist-results-grid">
                        {artistResults.map(artist => (
                          <div key={artist.id} className="artist-result-card" onClick={() => handleSelectArtist(artist)}>
                            {artist.cover ? (
                              <img src={artist.cover} alt={artist.name} className="artist-result-cover" />
                            ) : (
                              <div className="artist-result-cover-placeholder">🎤</div>
                            )}
                            <div className="artist-result-info">
                              <div className="artist-result-name">{artist.name}</div>
                              {artist.genres && artist.genres.length > 0 && (
                                <div className="artist-result-genres">{artist.genres.slice(0, 2).join(', ')}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <AnimatePresence>
            {activeTab === 'lyrics' && (
              <motion.div
                key="lyrics-view"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{ position: 'fixed', inset: 0, zIndex: 100 }}
              >
                <LyricsView
                  track={currentTrack}
                  currentTime={currentTime}
                  getCurrentTime={getCurrentTime}
                  duration={duration}
                  volume={volume}
                  onVolumeChange={setVolume}
                  isPlaying={isPlaying}
                  onPlayPause={togglePlayPause}
                  onNext={playNext}
                  onPrevious={playPrevious}
                  onSeek={handleLyricsSeek}
                  isLoading={isLoadingTrack}
                  onClose={() => setActiveTab('home')}
                  settings={settings}
                  t={t}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {activeTab === 'home' && !selectedPlaylist && !loading && !error && (
            <div className="featured-playlists">
              <h2 className="featured-title">{t('main_recommendations')}</h2>
              {recommendationMixes.length > 0 ? (
                <div className="featured-grid">
                  {recommendationMixes.map(mix => (
                    <div key={String(mix.id)} className="featured-playlist-card" onClick={() => loadMixTracks(mix)}>
                      {mix.cover ? (
                        <img src={mix.cover} alt={mix.title} className="featured-cover" />
                      ) : (
                        <div className="featured-cover-placeholder">
                          <span>🎵</span>
                        </div>
                      )}
                      <div className="featured-info">
                        <div className="featured-name">{mix.title}</div>
                        <div className="featured-meta">{mix.trackCount} {t('main_track_count')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="recommendations-soon">{t('main_recommendations_soon')}</p>
              )}
            </div>
          )}

          {activeTab !== 'lyrics' && !(activeTab === 'search' && selectedArtist) && (
            <>
              {loading || isSearching ? (
                <div className="loading-state"><div className="spinner"></div><p>{isSearching ? t('nav_search') + '...' : t('main_loading')}</p></div>
              ) : error ? (
                <div className="error-state"><span className="error-icon">⚠️</span><p>{error}</p></div>
              ) : displayTracks.length > 0 ? (
                <>
                  <div className="playlist-header">
                    <h2 className="playlist-name-large">{displayTitle}</h2>
                    <p className="playlist-description">{displayTracks.length} {t('main_playlist_tracks')}</p>
                  </div>
                  <div className="tracks-list">
                    <div className="tracks-header">
                      <div className="track-number">#</div>
                      <div className="track-title-header">{t('main_track_title_header')}</div>
                      <div className="track-album">{t('main_album_header')}</div>
                      <div className="track-duration"><TimeIcon size={18} /></div>
                    </div>
{displayTracks.map((track, idx) => (
                    <div key={track.id} className={`track-item ${currentTrack?.id === track.id ? 'playing' : ''} ${nextTrack?.id === track.id ? 'next' : ''}`} style={{ animationDelay: `${Math.min(idx * 0.04, 1)}s` }} onClick={() => playTrack(track)} onContextMenu={(e) => handleContextMenu(e, track)}>
                        <div className="track-number">
                          {currentTrack?.id === track.id && isLoadingTrack ? '⏳' : currentTrack?.id === track.id && isPlaying ? <SpeakerIcon size={18} /> : nextTrack?.id === track.id ? '⏭' : idx + 1}
                        </div>
                        <div className="track-info">
                          {track.cover && <img src={track.cover} alt={track.title} className="track-cover" />}
                          <div className="track-details">
                            <div className="track-title">
                              {track.title}
                              {track.explicit && <span className="explicit-badge">E</span>}
                            </div>
                            <div className="track-artist">{track.artists}</div>
                          </div>
                        </div>
                        <div className="track-album">{track.album}</div>
                        <div className="track-duration">
                          <button className={`favorite-btn ${isFavorite(track.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}>
                            <HeartIcon filled={isFavorite(track.id)} size={18} />
                          </button>
                          <span>{formatTime(track.duration / 1000)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">{activeTab === 'search' ? <SearchIcon size={48} /> : <PlayIcon size={48} />}</span>
                  <h2>{activeTab === 'search' ? (searchQuery ? t('main_error') : t('main_empty_search')) : t('main_empty_playlist')}</h2>
                </div>
              )}
            </>
          )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="context-menu-item" onClick={() => { toggleFavorite(contextMenu.track); closeContextMenu(); }}>
            <HeartIcon filled={isFavorite(contextMenu.track.id)} size={16} />
            <span>{isFavorite(contextMenu.track.id) ? ' ' + t('player_remove_favorite') : ' ' + t('context_add_favorite')}</span>
          </div>
          {localPlaylists.length > 0 && (
              <div className="context-menu-submenu">
                <div className="context-menu-item">
                  <span>📋 {t('context_add_to_playlist')} →</span>
                </div>
              <div className="context-menu-submenu-content">
                {localPlaylists.map(pl => (
                  <div key={pl.id} className="context-menu-item" onClick={() => { addToPlaylist(pl.id, contextMenu.track); closeContextMenu(); }}>
                    {pl.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedPlaylist?.type === 'local' && (
            <div className="context-menu-item delete" onClick={() => { removeFromPlaylist(selectedPlaylist.id, contextMenu.track.id); closeContextMenu(); }}>
              <DeleteIcon size={16} />
              <span> {t('context_remove_from_playlist')}</span>
            </div>
          )}
          {selectedPlaylist?.type === 'local-tracks' && (
            <div className="context-menu-item delete" onClick={() => { handleRemoveLocalTrack(contextMenu.track.id); closeContextMenu(); }}>
              <DeleteIcon size={16} />
              <span> {t('main_delete_file')}</span>
            </div>
          )}
          {selectedPlaylist?.type === 'soundcloud' && contextMenu?.track?.source === 'soundcloud' && (
            <div className="context-menu-item delete" onClick={() => { removeSoundcloudTrack(contextMenu.track.id); closeContextMenu(); }}>
              <DeleteIcon size={16} />
              <span> Удалить из SoundCloud</span>
            </div>
          )}
        </div>
      )}
      
      {showCreatePlaylist && (
        <div className="modal-overlay" onClick={() => setShowCreatePlaylist(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>{t('modal_create_playlist')}</h3>
          <input type="text" className="modal-input" placeholder={t('modal_playlist_name')} value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} autoFocus />
          <div className="modal-actions">
            <button className="modal-btn cancel" onClick={() => setShowCreatePlaylist(false)}>{t('modal_cancel')}</button>
            <button className="modal-btn create" onClick={createPlaylist}>{t('modal_create')}</button>
          </div>
        </div>
        </div>
      )}
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        subscriptionActive={subscriptionActive}
        subscriptionEndDate={subscriptionEndDate}
        onSubscriptionChange={() => {
          checkSubscription();
        }}
      />

      <AnimatePresence>
        {showSettings && (
          <SettingsView
            settings={settings}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
            onSelectGif={handleSelectGif}
            onClearLyricsCache={handleClearLyricsCache}
            onOpenSubscription={() => setShowSubscriptionModal(true)}
            subscriptionActive={subscriptionActive}
            t={t}
          />
        )}

        {showProfile && (
          <div className="settings-overlay" onClick={() => setShowProfile(false)}>
            <div className="profile-modal profile-modal-redesigned" onClick={(e) => e.stopPropagation()}>
              {/* Шапка с аватаром */}
              <div className="profile-header">
                <button className="profile-avatar-wrap" onClick={handleSelectAvatar} title={t('profile_change_photo')}>
                  {settings.avatar ? (
                    <img src={avatarSrc(settings.avatar)} alt="" className="profile-avatar-large profile-avatar-img" />
                  ) : (
                    <div className="profile-avatar-large">👤</div>
                  )}
                  <span className="profile-avatar-edit">📷</span>
                </button>
                <div className="profile-header-text">
                  <h2 style={nicknameStyle.style} className={nicknameStyle.className}>
                    {settings.customNickname || user?.login || t('user_default')}
                  </h2>
                  <p>{user?.email || t('user_default')}</p>
                </div>
              </div>

              {/* Две колонки: слева статистика, справа настройки профиля */}
              <div className="profile-columns">
                {/* Левая колонка — статистика и последний трек */}
                <div className="profile-col-left">
                  <div className="profile-stats-section profile-card-block">
                    <h3>{t ? t('profile_stats') : 'Статистика'}</h3>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-icon">❤️</span>
                        <div>
                          <div className="stat-value">{favorites.length}</div>
                          <div className="stat-label">{t ? t('profile_favorite_tracks') : 'Любимых треков'}</div>
                        </div>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">🎵</span>
                        <div>
                          <div className="stat-value">{recentlyPlayed.length}</div>
                          <div className="stat-label">{t ? t('profile_recent_tracks') : 'Недавних треков'}</div>
                        </div>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📂</span>
                        <div>
                          <div className="stat-value">{localPlaylists.length}</div>
                          <div className="stat-label">{t ? t('profile_playlists') : 'Плейлистов'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {recentlyPlayed.length > 0 && (
                    <div className="favorite-track profile-card-block">
                      <h4>{t ? t('profile_last_track') : 'Последний трек'}</h4>
                      <div className="track-mini">
                        {recentlyPlayed[0].cover ? (
                          <img src={recentlyPlayed[0].cover} alt="" className="track-mini-cover" />
                        ) : (
                          <div className="track-mini-cover-placeholder">🎵</div>
                        )}
                        <div className="track-mini-info">
                          <div className="track-mini-title">{recentlyPlayed[0].title}{recentlyPlayed[0].explicit && <span className="explicit-badge">E</span>}</div>
                          <div className="track-mini-artist">{recentlyPlayed[0].artists}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Правая колонка — настройки профиля */}
                <div className="profile-col-right">
                  <div className="profile-nickname profile-card-block">
                    <h4>{t ? t('profile_nickname') : 'Никнейм'}</h4>
                    <input
                      type="text"
                      value={settings.customNickname || user?.login || ''}
                      onChange={async (e) => {
                        const newNickname = e.target.value.trim();
                        if (window.electron?.nickname && newNickname) {
                          const result = await window.electron.nickname.set(newNickname);
                          if (result?.success) {
                            saveSettings({ customNickname: newNickname });
                            const info = await window.electron.nickname.getCooldown();
                            if (info) setNicknameCooldown(info);
                          } else if (result?.message) {
                            alert(result.message);
                          }
                        } else {
                          saveSettings({ customNickname: newNickname });
                        }
                      }}
                      disabled={!nicknameCooldown.canChange}
                      placeholder={t ? t('profile_enter_nickname') : 'Введите никнейм'}
                      className="profile-nickname-input"
                    />
                    {!nicknameCooldown.canChange && nicknameCooldown.remaining > 0 && (
                      <p className="profile-nickname-hint" style={{ color: '#ff6b6b' }}>
                        Можно сменить через {Math.ceil(nicknameCooldown.remaining / (1000 * 60 * 60 * 24))} дн.
                      </p>
                    )}
                    {nicknameCooldown.canChange && (
                      <p className="profile-nickname-hint">
                        {t ? t('profile_nickname_unique') : 'Никнейм можно менять раз в 7 дней'}
                      </p>
                    )}
                  </div>

<div className="profile-color profile-card-block nickname-customizer">
                    <h4>{t('profile_color')}</h4>

                    <div className="nickname-preview-box">
                      <span className={`nickname-preview-name ${nicknameStyle.className}`} style={nicknameStyle.style}>
                        {settings.customNickname || user?.login || t('user_default')}
                      </span>
                    </div>

                    <div className="nickname-theme-label">{t('profile_nickname_theme')}</div>
                    <div className="nickname-swatches">
                      {SOLID_COLORS.map(c => (
                        <button
                          key={c.id}
                          className={`nickname-swatch ${isSolidColor(settings.userColor) && settings.userColor === c.id ? 'nickname-swatch-active' : ''}`}
                          style={{ backgroundColor: c.color }}
                          title={nicknameLabel(settings.language, SOLID_COLORS, c.id)}
                          onClick={() => saveSettings({ ...settings, userColor: c.id })}
                        />
                      ))}
                    </div>
                    <div className="nickname-swatches">
                      <button
                        className={`nickname-swatch nickname-swatch-gradient ${!isSolidColor(settings.userColor) && settings.userColor === 'custom' ? 'nickname-swatch-active' : ''}`}
                        style={{ background: `linear-gradient(45deg, ${settings.nicknameGradientColor1 || '#ff6b35'}, ${settings.nicknameGradientColor2 || '#3742fa'})` }}
                        title={t('profile_nickname_custom')}
                        onClick={() => saveSettings({ ...settings, userColor: 'custom' })}
                      />
                      {GRADIENT_PRESETS.map(g => (
                        <button
                          key={g.id}
                          className={`nickname-swatch nickname-swatch-gradient ${!isSolidColor(settings.userColor) && settings.userColor === g.id ? 'nickname-swatch-active' : ''}`}
                          style={{ background: nicknameGradientStyle(g.id, settings.nicknameGradientDirection || '45deg') }}
                          title={nicknameLabel(settings.language, GRADIENT_PRESETS, g.id)}
                          onClick={() => saveSettings({ ...settings, userColor: g.id })}
                        />
                      ))}
                    </div>

                    {!isSolidColor(settings.userColor) && (
                      <>
                        {settings.userColor === 'custom' && (
                          <div className="nickname-row">
                            <span className="nickname-control-label">{t('profile_nickname_custom')}</span>
                            <div className="nickname-row-content">
                              <span className="nickname-color-label">{t('profile_nickname_color1')}</span>
                              <input
                                type="color"
                                value={settings.nicknameGradientColor1 || '#ff6b35'}
                                onChange={(e) => saveSettings({ ...settings, nicknameGradientColor1: e.target.value })}
                                className="nickname-color-input"
                              />
                              <span className="nickname-color-label">{t('profile_nickname_color2')}</span>
                              <input
                                type="color"
                                value={settings.nicknameGradientColor2 || '#3742fa'}
                                onChange={(e) => saveSettings({ ...settings, nicknameGradientColor2: e.target.value })}
                                className="nickname-color-input"
                              />
                            </div>
                          </div>
                        )}
                        <div className="nickname-row">
                          <span className="nickname-control-label">{t('profile_nickname_direction')}</span>
                          <div className="nickname-direction-btns">
                            {NICKNAME_DIRECTIONS.map(d => (
                              <button
                                key={d.id}
                                className={`nickname-dir-btn ${settings.nicknameGradientDirection === d.id ? 'active' : ''}`}
                                onClick={() => saveSettings({ ...settings, nicknameGradientDirection: d.id })}
                              >
                                {nicknameLabel(settings.language, NICKNAME_DIRECTIONS, d.id)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="nickname-row">
                          <span className="nickname-control-label">{t('profile_nickname_animation')}</span>
                          <div className="nickname-row-content">
                            <label className="nickname-toggle">
                              <input
                                type="checkbox"
                                checked={!!settings.nicknameAnimate}
                                onChange={(e) => saveSettings({ ...settings, nicknameAnimate: e.target.checked })}
                              />
                              <span className="nickname-toggle-track"><span className="nickname-toggle-thumb" /></span>
                            </label>
                            {settings.nicknameAnimate && (
                              <>
                                <select
                                  value={settings.nicknameAnimateDirection || 'left'}
                                  onChange={(e) => saveSettings({ ...settings, nicknameAnimateDirection: e.target.value })}
                                  className="nickname-select nickname-select-inline"
                                >
                                  {NICKNAME_ANIM_DIRECTIONS.map(d => (
                                    <option key={d.id} value={d.id}>{nicknameLabel(settings.language, NICKNAME_ANIM_DIRECTIONS, d.id)}</option>
                                  ))}
                                </select>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="1"
                                  value={settings.nicknameAnimateSpeed || 4}
                                  onChange={(e) => saveSettings({ ...settings, nicknameAnimateSpeed: Number(e.target.value) })}
                                  className="nickname-range nickname-range-inline"
                                  title={`${t('profile_nickname_anim_speed')}: ${settings.nicknameAnimateSpeed}s`}
                                />
                                <span className="nickname-range-val">{settings.nicknameAnimateSpeed}s</span>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="nickname-row">
                      <span className="nickname-control-label">{t('profile_nickname_font')}</span>
                      <select
                        value={settings.nicknameFont || 'default'}
                        onChange={(e) => saveSettings({ ...settings, nicknameFont: e.target.value })}
                        className="nickname-select"
                      >
                        {NICKNAME_FONTS.map(f => (
                          <option key={f.id} value={f.id}>{nicknameLabel(settings.language, NICKNAME_FONTS, f.id)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="nickname-row">
                      <span className="nickname-control-label">{t('profile_nickname_effects')}</span>
                      <div className="nickname-row-content">
                        <div className="nickname-effect-btns">
                          <button
                            className={`nickname-effect-btn ${settings.nicknameBold ? 'active' : ''}`}
                            onClick={() => saveSettings({ ...settings, nicknameBold: !settings.nicknameBold })}
                            title={t('profile_nickname_bold')}
                          >B</button>
                          <button
                            className={`nickname-effect-btn nickname-effect-italic ${settings.nicknameItalic ? 'active' : ''}`}
                            onClick={() => saveSettings({ ...settings, nicknameItalic: !settings.nicknameItalic })}
                            title={t('profile_nickname_italic')}
                          >I</button>
                          <button
                            className={`nickname-effect-btn ${settings.nicknameUppercase ? 'active' : ''}`}
                            onClick={() => saveSettings({ ...settings, nicknameUppercase: !settings.nicknameUppercase })}
                            title={t('profile_nickname_uppercase')}
                          >AA</button>
                          <button
                            className={`nickname-effect-btn ${settings.nicknameGlow ? 'active' : ''}`}
                            onClick={() => saveSettings({ ...settings, nicknameGlow: !settings.nicknameGlow })}
                            title={t('profile_nickname_glow')}
                          >✨</button>
                        </div>
                        {settings.nicknameGlow && (
                          <>
                            <input
                              type="color"
                              value={settings.nicknameGlowColor || '#ffffff'}
                              onChange={(e) => saveSettings({ ...settings, nicknameGlowColor: e.target.value })}
                              className="nickname-color-input"
                            />
                            <input
                              type="range"
                              min="2"
                              max="30"
                              step="1"
                              value={settings.nicknameGlowBlur || 8}
                              onChange={(e) => saveSettings({ ...settings, nicknameGlowBlur: Number(e.target.value) })}
                              className="nickname-range nickname-range-inline"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="nickname-row">
                      <span className="nickname-control-label">{t('profile_nickname_spacing')}</span>
                      <div className="nickname-row-content">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={settings.nicknameLetterSpacing || 0}
                          onChange={(e) => saveSettings({ ...settings, nicknameLetterSpacing: Number(e.target.value) })}
                          className="nickname-range"
                        />
                        <span className="nickname-range-val">{settings.nicknameLetterSpacing}px</span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-actions profile-card-block">
                    <button className="profile-logout-btn" onClick={() => { handleLogout(); setShowProfile(false); }}>
                      <span>{t('sidebar_logout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {activeTab !== 'lyrics' && (
        <div className={`player-bar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {currentTrack || nextTrack ? (
            <>
              <div className="player-track-info">
                {(currentTrack?.cover || nextTrack?.cover) && <img src={currentTrack?.cover || nextTrack?.cover} alt={currentTrack?.title || nextTrack?.title} className="player-cover" />}
                <div className="player-track-details">
                  <div className="player-track-title">{nextTrack ? `⏭ ${nextTrack.title}` : currentTrack?.title || t('player_unknown_artist')}</div>
                  <div className="player-track-artist">{nextTrack ? nextTrack.artists : currentTrack?.artists || t('player_unknown_artist')}</div>
                </div>
                {currentTrack && (
                  <button className={`player-like-btn ${isFavorite(currentTrack.id) ? 'active' : ''}`} onClick={() => toggleFavorite(currentTrack)}>
                    <HeartIcon filled={isFavorite(currentTrack.id)} size={20} />
                  </button>
                )}
              </div>
              <div className="player-controls-center">
                <div className="player-buttons">
                  <button className="player-btn" onClick={playPrevious}>
                    <PrevIcon size={20} />
                  </button>
                  <button className="player-btn player-btn-play" onClick={togglePlayPause}>
                    {isLoadingTrack || isCrossfading ? '⏳' : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                  </button>
                  <button className="player-btn" onClick={playNext}>
                    <NextIcon size={20} />
                  </button>
                </div>
                <PlayerProgress
                  getCurrentTime={getCurrentTime}
                  duration={duration}
                  primaryColor={settings.primaryColor}
                  onSeek={(newTime) => {
                    if (currentTrack?.source === 'soundcloud') {
                      const widget = scWidgetRef.current;
                      if (widget && !isNaN(newTime)) {
                        widget.seekTo(newTime * 1000);
                        setCurrentTime(newTime);
                      }
                      return;
                    }
                    const audio = activeAudioRef.current === 1 ? audioRef1.current : audioRef2.current;
                    if (audio && !isNaN(newTime)) { audio.currentTime = newTime; setCurrentTime(newTime); }
                  }}
                />
              </div>
              <div className="player-controls-right">
                <button className="player-btn player-shuffle" onClick={toggleShuffle}>
                  <span className="player-action-icon"><MixIcon size={18} /></span>
                </button>
                <button className="player-btn player-repeat" onClick={toggleRepeat}>
                  <span className="player-action-icon">
                    <RepeatIcon size={18} />
                  </span>
                </button>
                <div className="volume-wrap">
                  <div className="volume-popup">
                    <div
                      className="volume-bar"
                      onMouseDown={(e) => {
                        const bar = e.currentTarget;
                        const rect = bar.getBoundingClientRect();
                        const percent = 1 - (e.clientY - rect.top) / rect.height;
                        setVolume(Math.max(0, Math.min(1, percent)));

                        const handleMouseMove = (moveEvent) => {
                          const moveRect = bar.getBoundingClientRect();
                          const movePercent = 1 - (moveEvent.clientY - moveRect.top) / moveRect.height;
                          setVolume(Math.max(0, Math.min(1, movePercent)));
                        };

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };

                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div
                        className="volume-filled"
                        style={{ height: `${Math.min(volume * 100, 100)}%`, background: settings.primaryColor }}
                      />
                      <div
                        className="volume-handle"
                        style={{ bottom: `${Math.min(volume * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <button className="player-btn" onClick={() => setVolume(v => v === 0 ? 0.7 : 0)}>
                    {volume === 0 ? '🔇' : <VolumeIcon size={18} />}
                    <span className="volume-percent-text">{Math.round(volume * 100)}%</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="player-empty">
              <div className="player-empty-icon">🎵</div>
              <div className="player-empty-text">{t('player_empty_title')}</div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;