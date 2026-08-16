const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const yandexApi = require('./yandex-music-api');
const crypto = require('crypto');
const DiscordRPC = require('discord-rpc');
const axios = require('axios');
const { parse } = require('node-html-parser');

const store = new Store();
let mainWindow;

const BACKEND_URL = process.env.FLOWMUSIC_SERVER || 'http://localhost:3001';

// Инициализация
if (!store.has('deviceId')) store.set('deviceId', crypto.randomUUID());
if (!store.has('localPlaylists')) store.set('localPlaylists', []);
if (!store.has('favoriteTracks')) store.set('favoriteTracks', []);
if (!store.has('lyricsCache')) store.set('lyricsCache', {});
if (!store.has('customLyrics')) store.set('customLyrics', {});
if (!store.has('playerState')) {
  store.set('playerState', {
    currentTrack: null,
    volume: 0.7,
    currentTime: 0,
    isPlaying: false
  });
}
if (!store.has('settings')) {
  store.set('settings', {
    primaryColor: '#1ed760',
    backgroundColor: '#121212',
    sidebarColor: '#000000',
    cardColor: '#181818',
    accentColor: '#1ed760',
    enableVisualizer: true,
    enableFullscreenCover: false,
    enableSnowEffect: false,
    enableColorFromMusic: true,
    animationsEnabled: true,
    crossfade: 0
  });
}

function generateId() {
  return crypto.randomUUID();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, '../assets/icon.ico'),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  registerShortcuts();

  // Discord RPC
  initDiscordRPC();
}

function initDiscordRPC() {
  const settings = store.get('settings', {});
  const clientId = settings.discordClientId || '1493915291745386597';
  console.log('Initializing Discord RPC with clientId:', clientId);
  if (!clientId || clientId === '1250000000000000000') {
    console.log('Discord RPC disabled: no valid Client ID');
    return;
  }

  const rpc = new DiscordRPC.Client({ transport: 'ipc' });
  // Set a timeout for connection
  setTimeout(() => {
    if (!global.rpc) {
      console.log('Discord RPC connection timeout - make sure Discord is running');
    }
  }, 10000);

  rpc.on('ready', () => {
    console.log('Discord RPC connected successfully, user:', rpc.user);
    global.rpc = rpc;
    // Set initial activity
    rpc.setActivity({
      details: 'Flowmusic',
      state: 'Ready to play music',
      largeImageKey: 'logo',
      largeImageText: 'Flowmusic Player'
    }).then(() => {
      console.log('Initial Discord activity set');
    }).catch(err => console.error('Initial activity error:', err));
  });

  rpc.on('connected', () => {
    console.log('Discord RPC connected');
  });

  rpc.on('disconnected', () => {
    console.log('Discord RPC disconnected');
    global.rpc = null;
  });

  console.log('Attempting Discord RPC login...');
  rpc.login({ clientId }).then(() => {
    console.log('Discord RPC login successful');
  }).catch(err => {
    console.error('Discord RPC login failed:', err);
    console.error('Make sure Discord is running and Client ID is correct');
  });
}

function registerShortcuts() {
  globalShortcut.register('Control+Right', () => mainWindow.webContents.send('shortcut:next'));
  globalShortcut.register('Control+Left', () => mainWindow.webContents.send('shortcut:previous'));
  globalShortcut.register('Control+F', () => mainWindow.webContents.send('shortcut:search'));
  globalShortcut.register('Control+L', () => mainWindow.webContents.send('shortcut:lyrics'));
  globalShortcut.register('Control+S', () => mainWindow.webContents.send('shortcut:saveplaylist'));
  globalShortcut.register('Control+,', () => mainWindow.webContents.send('shortcut:settings'));
}

app.whenReady().then(() => {
  // Чтобы панель задач Windows показывала нашу иконку, а не дефолтную Electron
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.flowmusic.app');
  }
  createWindow();
  setupIpcHandlers();
});

app.on('browser-window-blur', () => globalShortcut.unregisterAll());
app.on('browser-window-focus', () => registerShortcuts());

// ============ Функции для текстов ============
function getCachedLyrics(trackId) {
  const cache = store.get('lyricsCache') || {};
  return cache[trackId] || null;
}

function cacheLyrics(trackId, lyrics) {
  const cache = store.get('lyricsCache') || {};
  cache[trackId] = { ...lyrics, cachedAt: Date.now() };
  store.set('lyricsCache', cache);
}

async function fetchFromLRCLIB(trackName, artistName, duration) {
  try {
    const mainArtist = artistName.split(',')[0].trim();
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(trackName + ' ' + mainArtist)}`;
    const searchResponse = await axios.get(searchUrl, { headers: { 'User-Agent': 'flowmusic/2.0' }, timeout: 10000 });
    
    if (searchResponse.data?.length > 0) {
      const song = searchResponse.data[0];
      const getParams = new URLSearchParams();
      getParams.append('track_name', song.trackName);
      getParams.append('artist_name', song.artistName);
      if (song.albumName) getParams.append('album_name', song.albumName);
      getParams.append('duration', song.duration || Math.floor(duration / 1000));
      
      const getUrl = `https://lrclib.net/api/get?${getParams.toString()}`;
      const getResponse = await axios.get(getUrl, { headers: { 'User-Agent': 'flowmusic/2.0' }, timeout: 10000 });
      
      if (getResponse.data) {
        return { synced: getResponse.data.syncedLyrics || null, plain: getResponse.data.plainLyrics || null, source: 'lrclib' };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchFromTextovoi(trackName, artistName) {
  try {
    const query = encodeURIComponent(`${artistName} ${trackName}`);
    const searchUrl = `https://textovoi.ru/search?q=${query}`;
    const response = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    const root = parse(response.data);
    
    const links = [];
    root.querySelectorAll('a[href*="/text/"]').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.text.toLowerCase();
      if (href && (text.includes(trackName.toLowerCase()) || text.includes(artistName.toLowerCase()))) {
        links.push(href);
      }
    });
    
    for (const link of links.slice(0, 3)) {
      try {
        const fullUrl = link.startsWith('http') ? link : `https://textovoi.ru${link}`;
        const textResponse = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const textRoot = parse(textResponse.data);
        let lyrics = '';
        textRoot.querySelectorAll('.lyrics-text, .text-block, .song-text, .content p').forEach(el => { lyrics += el.text + '\n'; });
        if (lyrics.length > 100) {
          return { plain: lyrics.trim(), synced: null, source: 'textovoi', url: fullUrl };
        }
      } catch (e) {}
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchFromMegalyrics(trackName, artistName) {
  try {
    const query = encodeURIComponent(`${artistName} ${trackName}`);
    const searchUrl = `https://megalyrics.ru/search?q=${query}`;
    const response = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    const root = parse(response.data);
    
    const links = [];
    root.querySelectorAll('a[href*="/lyrics/"]').forEach(el => links.push(el.getAttribute('href')));
    
    for (const link of links.slice(0, 3)) {
      try {
        const fullUrl = link.startsWith('http') ? link : `https://megalyrics.ru${link}`;
        const textResponse = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const textRoot = parse(textResponse.data);
        const lyricsEl = textRoot.querySelector('.lyrics-text, .text, .content');
        const lyrics = lyricsEl ? lyricsEl.text.trim() : '';
        if (lyrics.length > 100) {
          return { plain: lyrics, synced: null, source: 'megalyrics', url: fullUrl };
        }
      } catch (e) {}
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchFromGenius(trackName, artistName) {
  try {
    const mainArtist = artistName.split(',')[0].trim();
    const searchQuery = `${artistName} ${trackName}`;
    const searchUrl = `https://genius.com/api/search?q=${encodeURIComponent(searchQuery)}`;
    const response = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 10000 });
    
    const sections = response.data.response?.sections;
    if (sections) {
      for (const section of sections) {
        if (section.hits) {
          for (const hit of section.hits) {
            if (hit.result?.url) {
              const lyrics = await scrapeGeniusLyrics(hit.result.url);
              if (lyrics) {
                return { plain: lyrics, synced: null, source: 'genius', url: hit.result.url };
              }
            }
          }
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function scrapeGeniusLyrics(url) {
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    const html = response.data;
    const containerMatches = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g);
    if (containerMatches) {
      let lyrics = containerMatches
        .map(container => { const content = container.match(/<div[^>]*>([\s\S]*?)<\/div>/); return content ? content[1] : ''; })
        .join('\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/\[.*?\]/g, '')
        .trim();
      lyrics = lyrics.replace(/\n{3,}/g, '\n\n');
      if (lyrics.length > 50) return lyrics;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function setupIpcHandlers() {
  // Яндекс API
  ipcMain.handle('yandex:validate-token', async (e, token) => yandexApi.validateToken(token));
  ipcMain.handle('yandex:get-token', () => store.get('yandexToken', null));
  ipcMain.handle('yandex:save-token', (e, token) => { store.set('yandexToken', token); return true; });
  ipcMain.handle('yandex:get-playlists', async (e, token) => yandexApi.getUserPlaylists(token));
  ipcMain.handle('yandex:get-playlist-tracks', async (e, token, id, type, uid) => yandexApi.getPlaylistTracks(token, id, type, uid));
  ipcMain.handle('yandex:get-recommendations', async (e, token) => yandexApi.getRecommendations(token));
  ipcMain.handle('yandex:get-recommendation-mixes', async (e, token) => yandexApi.getRecommendationMixes(token));
  ipcMain.handle('yandex:search', async (e, token, query) => yandexApi.search(token, query));
  ipcMain.handle('yandex:search-artists', async (e, token, query) => yandexApi.searchArtists(token, query));
  ipcMain.handle('yandex:artist-details', async (e, token, artistId) => yandexApi.getArtistDetails(token, artistId));
  ipcMain.handle('yandex:artist-tracks', async (e, token, artistId, pageSize) => yandexApi.getArtistTracks(token, artistId, pageSize));
  ipcMain.handle('yandex:get-stream-url', async (e, token, trackId) => yandexApi.getStreamUrl(token, trackId));

  // Яндекс OAuth логин через BrowserWindow
  ipcMain.handle('yandex:oauth-login', async () => {
    const clientId = '23cabbbdc6cd418abb4b39c32c41195d';
    const redirectUri = 'https://music.yandex.ru/';
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        title: 'Авторизация Яндекс.Музыки',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      let resolved = false;
      const finish = (token) => {
        if (resolved) return;
        resolved = true;
        try { if (!authWindow.isDestroyed()) authWindow.close(); } catch(e) {}
        resolve(token);
      };

      const tryExtractToken = (url) => {
        if (!url || !url.includes('access_token=')) return false;
        const match = url.match(/access_token=([^&]+)/);
        if (match && match[1]) {
          console.log('OAuth: token extracted from URL');
          finish(match[1]);
          return true;
        }
        return false;
      };

      // 1) Перехват 302-редиректа (до навигации)
      authWindow.webContents.on('will-redirect', (event, url) => {
        console.log('OAuth will-redirect:', url.slice(0, 120));
        if (tryExtractToken(url)) {
          event.preventDefault();
        }
      });

      // 2) После навигации — проверяем URL
      authWindow.webContents.on('did-navigate', (event, url) => {
        console.log('OAuth did-navigate:', url.slice(0, 120));
        tryExtractToken(url);
      });

      // 3) После загрузки страницы — читаем hash через JS
      authWindow.webContents.on('did-finish-load', async () => {
        try {
          const hash = await authWindow.webContents.executeJavaScript('window.location.hash');
          console.log('OAuth did-finish-load hash:', (hash || '').slice(0, 80));
          if (hash && hash.includes('access_token=')) {
            tryExtractToken(hash);
          }
        } catch(e) {
          console.log('OAuth executeJS error:', e.message);
        }
      });

      // Если окно закрыли — отменяем
      authWindow.on('closed', () => {
        console.log('OAuth window closed');
        finish(null);
      });

      authWindow.loadURL(authUrl);
    });
  });

  // VK API proxy
  ipcMain.handle('vk:request', async (e, method, token, params) => {
    try {
      const url = new URL(`https://api.vk.com/method/${method}`);
      url.searchParams.set('access_token', token);
      url.searchParams.set('v', '5.131');
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
      }
      const response = await axios.get(url.toString(), {
        headers: {
          'User-Agent': 'KateMobileAndroid/56 lite-460 (Android 4.4.2; SDK 19; x86; unknown Android SDK built for x86; en)'
        }
      });
      console.log('VK API response for', method, ':', JSON.stringify(response.data).substring(0, 200));
      return response.data;
    } catch (err) {
      console.error('VK API error:', err.message);
      return { error: { error_msg: err.message } };
    }
  });

  // Избранное
  ipcMain.handle('favorites:get', () => store.get('favoriteTracks', []));
  ipcMain.handle('favorites:add', (e, track) => {
    const favs = store.get('favoriteTracks', []);
    if (!favs.find(t => t.id === track.id)) { favs.push({ ...track, addedAt: Date.now() }); store.set('favoriteTracks', favs); }
    return favs;
  });
  ipcMain.handle('favorites:remove', (e, trackId) => {
    const favs = store.get('favoriteTracks', []).filter(t => t.id !== trackId);
    store.set('favoriteTracks', favs); return favs;
  });

  // Плейлисты
  ipcMain.handle('playlists:getAll', () => store.get('localPlaylists', []));
  ipcMain.handle('playlists:create', (e, name) => {
    const pls = store.get('localPlaylists', []);
    const newPl = { id: generateId(), name, tracks: [], createdAt: Date.now() };
    pls.push(newPl); store.set('localPlaylists', pls); return newPl;
  });
  ipcMain.handle('playlists:delete', (e, id) => {
    const pls = store.get('localPlaylists', []).filter(p => p.id !== id);
    store.set('localPlaylists', pls); return pls;
  });
  ipcMain.handle('playlists:addTrack', (e, plId, track) => {
    const pls = store.get('localPlaylists', []);
    const pl = pls.find(p => p.id === plId);
    if (pl && !pl.tracks.find(t => t.id === track.id)) { pl.tracks.push(track); store.set('localPlaylists', pls); }
    return pl;
  });
  ipcMain.handle('playlists:removeTrack', (e, plId, trackId) => {
    const pls = store.get('localPlaylists', []);
    const pl = pls.find(p => p.id === plId);
    if (pl) { pl.tracks = pl.tracks.filter(t => t.id !== trackId); store.set('localPlaylists', pls); }
    return pl;
  });

  // Выбор GIF
  ipcMain.handle('dialog:select-gif', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите GIF для фона',
      filters: [{ name: 'GIF Files', extensions: ['gif'] }],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('dialog:select-avatar', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите фото профиля',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const fs = require('fs');
    const avatarDir = path.join(app.getPath('userData'), 'avatars');
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

    const ext = path.extname(result.filePaths[0]).toLowerCase();
    const destPath = path.join(avatarDir, 'profile' + ext);
    fs.copyFileSync(result.filePaths[0], destPath);
    return destPath;
  });

  // ============ ТЕКСТЫ ПЕСЕН ============
  
  // Получение текста
  // Яндекс отдаёт заглушку вместо текста для аккаунтов без Плюса
  function isYandexPlusPrompt(text) {
    if (!text) return false;
    return /подключите подписку|чтобы видеть тексты песен/i.test(text);
  }

  ipcMain.handle('lyrics:get', async (e, trackId, trackName, artistName, albumName, duration) => {
    // 1. Проверяем кастомный текст
    const customLyrics = store.get('customLyrics') || {};
    if (customLyrics[trackId]) {
      return { ...customLyrics[trackId], fromCustom: true };
    }
    
    // 2. Проверяем кэш
    const cached = getCachedLyrics(trackId);
    if (cached && !isYandexPlusPrompt(cached.plain)) return { ...cached, fromCache: true };

    // 3. Ищем в источниках
    let result = null;

    // 3a. Тексты для SoundCloud: ищем эту же песню в Яндекс.Музыке
    const yandexToken = store.get('yandexToken');
    if (yandexToken && String(trackId).startsWith('sc_')) {
      try {
        const search = await yandexApi.search(yandexToken, `${artistName} ${trackName}`);
        const results = search?.tracks?.results || [];
        // Ищем точное совпадение по названию (исполнитель может отличаться транслитерацией)
        const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const match = results.find(t =>
          norm(t.title) === norm(trackName) ||
          norm(t.title).includes(norm(trackName)) ||
          norm(trackName).includes(norm(t.title))
        ) || results[0];

        if (match) {
          const yandexLyrics = await yandexApi.getLyrics(yandexToken, match.id);
          if (yandexLyrics && !isYandexPlusPrompt(yandexLyrics.plain)) {
            result = { ...yandexLyrics, source: 'yandex' };
          }
        }
      } catch (err) {
        console.error('[lyrics] SoundCloud->Yandex lookup error:', err.message);
      }
    }

    // 3b. Яндекс.Музыка (обычный трек и fallback для SoundCloud)
    if (!result && yandexToken && !String(trackId).startsWith('sc_')) {
      const yandexLyrics = await yandexApi.getLyrics(yandexToken, trackId);
      if (yandexLyrics && !isYandexPlusPrompt(yandexLyrics.plain)) {
        result = yandexLyrics;
      } else if (yandexLyrics) {
        console.log('[lyrics] Yandex gates lyrics behind Plus for', trackId, '- using fallback source');
      }
    }

    // 3c. LRCLIB и остальные источники
    if (!result) {
      const lrclib = await fetchFromLRCLIB(trackName, artistName, duration);
      if (lrclib?.synced) {
        result = lrclib;
      } else {
        const textovoi = await fetchFromTextovoi(trackName, artistName);
        if (textovoi) {
          result = textovoi;
        } else {
          const megalyrics = await fetchFromMegalyrics(trackName, artistName);
          if (megalyrics) {
            result = megalyrics;
          } else {
            const genius = await fetchFromGenius(trackName, artistName);
            if (genius) result = genius;
          }
        }
        if (!result && lrclib?.plain) result = lrclib;
      }
    }

    if (result) {
      cacheLyrics(trackId, result);
      return result;
    }
    return null;
  });

  // Сохранение кастомного текста
  ipcMain.handle('lyrics:saveCustom', (e, trackId, lyrics) => {
    const customLyrics = store.get('customLyrics') || {};
    customLyrics[trackId] = {
      plain: lyrics,
      synced: null,
      source: 'custom',
      updatedAt: Date.now()
    };
    store.set('customLyrics', customLyrics);
    return true;
  });

  // Получение только кастомного текста
  ipcMain.handle('lyrics:getCustom', (e, trackId) => {
    const customLyrics = store.get('customLyrics') || {};
    return customLyrics[trackId] || null;
  });

  // Удаление кастомного текста
  ipcMain.handle('lyrics:deleteCustom', (e, trackId) => {
    const customLyrics = store.get('customLyrics') || {};
    delete customLyrics[trackId];
    store.set('customLyrics', customLyrics);
    return true;
  });

  // Очистка кэша
  ipcMain.handle('lyrics:clearCache', () => { 
    store.set('lyricsCache', {}); 
    return true; 
  });

  // Настройки
  ipcMain.handle('settings:get', () => store.get('settings'));
  ipcMain.handle('settings:save', (e, settings) => { store.set('settings', settings); return true; });

  // Clipboard
  ipcMain.handle('clipboard:read-text', () => {
    const { clipboard } = require('electron');
    try {
      const text = clipboard.readText();
      return typeof text === 'string' ? text : '';
    } catch (err) {
      console.error('Clipboard read error:', err);
      return '';
    }
  });

  // Локальные треки
  if (!store.has('localTracks')) store.set('localTracks', []);

  ipcMain.handle('localTracks:select', async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите аудиофайлы',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled || result.filePaths.length === 0) return [];

    const fs = require('fs');
    const existingTracks = store.get('localTracks', []);
    const newTracks = [];

    for (const filePath of result.filePaths) {
      // Skip duplicates
      if (existingTracks.some(t => t.filePath === filePath)) continue;

      const fileName = path.basename(filePath, path.extname(filePath));
      // Try to parse "Artist - Title" format
      let title = fileName;
      let artists = 'Локальный файл';
      if (fileName.includes(' - ')) {
        const parts = fileName.split(' - ');
        artists = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      const stat = fs.statSync(filePath);
      const track = {
        id: 'local_' + generateId(),
        title,
        artists,
        album: 'Локальные файлы',
        duration: 0, // Will be determined during playback
        durationMs: 0,
        cover: null,
        filePath,
        source: 'local',
        addedAt: Date.now(),
        fileSize: stat.size
      };
      newTracks.push(track);
    }

    if (newTracks.length > 0) {
      const updated = [...existingTracks, ...newTracks];
      store.set('localTracks', updated);
      return updated;
    }
    return existingTracks;
  });

  ipcMain.handle('localTracks:getAll', () => store.get('localTracks', []));

  ipcMain.handle('localTracks:remove', (e, trackId) => {
    const tracks = store.get('localTracks', []).filter(t => t.id !== trackId);
    store.set('localTracks', tracks);
    return tracks;
  });

  ipcMain.handle('localTracks:clear', () => {
    store.set('localTracks', []);
    return [];
  });

  // Discord RPC
  ipcMain.handle('discord:set-activity', (e, activity) => {
    console.log('Setting Discord activity:', activity);
    if (global.rpc && global.rpc.user) {
      global.rpc.setActivity(activity).then(() => {
        console.log('Discord activity updated successfully');
      }).catch(err => {
        console.error('Discord RPC setActivity error:', err);
      });
    } else {
      console.log('Discord RPC not ready or not connected');
    }
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (global.rpc) {
    global.rpc.destroy();
  }
});

  // Subscription / Monetization
  ipcMain.handle('device:getId', () => store.get('deviceId'));

  // Nickname cooldown (once per 7 days)
  ipcMain.handle('nickname:get-cooldown', () => {
    const lastChange = store.get('lastNicknameChange', null);
    if (lastChange) {
      const diff = Date.now() - lastChange;
      const remaining = Math.max(0, 7 * 24 * 60 * 60 * 1000 - diff);
      return { lastChange, remaining, canChange: diff >= 7 * 24 * 60 * 60 * 1000 };
    }
    return { lastChange: null, remaining: 0, canChange: true };
  });

  ipcMain.handle('nickname:set', (e, nickname) => {
    const now = Date.now();
    const lastChange = store.get('lastNicknameChange', null);
    if (lastChange && now - lastChange < 7 * 24 * 60 * 60 * 1000) {
      return { success: false, message: 'Никнейм можно менять только раз в 7 дней' };
    }
    store.set('nickname', nickname);
    store.set('lastNicknameChange', now);
    return { success: true };
  });

  ipcMain.handle('subscription:getPrice', async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/price`, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.error('Failed to get price:', err.message);
      return null;
    }
  });

  ipcMain.handle('subscription:status', async () => {
    try {
      const deviceId = store.get('deviceId');
      const res = await axios.get(`${BACKEND_URL}/api/subscription/${deviceId}`, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.error('Failed to check subscription:', err.message);
      return { active: false, subscription: null, error: err.message };
    }
  });

  ipcMain.handle('subscription:createPayment', async () => {
    try {
      const deviceId = store.get('deviceId');
      const res = await axios.post(`${BACKEND_URL}/api/payment/create`, { deviceId }, { timeout: 10000 });
      return res.data;
    } catch (err) {
      console.error('Failed to create payment:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('subscription:checkStatus', async (e, invId) => {
    try {
      const deviceId = store.get('deviceId');
      const res = await axios.post(`${BACKEND_URL}/api/payment/check-status`, { deviceId, invId }, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.error('Failed to check payment status:', err.message);
      return { paid: false };
    }
  });

  ipcMain.handle('subscription:checkActive', async () => {
    try {
      const deviceId = store.get('deviceId');
      const res = await axios.post(`${BACKEND_URL}/api/payment/check-active`, { deviceId }, { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.error('Failed to check active:', err.message);
      return { active: false };
    }
  });

  ipcMain.handle('subscription:openUrl', (e, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });

  ipcMain.handle('subscription:activateCode', async (e, code) => {
    try {
      const deviceId = store.get('deviceId');
      const res = await axios.post(`${BACKEND_URL}/api/code/activate`, { code, deviceId }, { timeout: 10000 });
      return res.data;
    } catch (err) {
      console.error('Failed to activate code:', err.message);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  });

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });
ipcMain.handle('player:saveState', (e, state) => {
    store.set('playerState', state);
    return true;
  });
  ipcMain.handle('player:getState', () => {
    return store.get('playerState');
  });