const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const path = require('path');

const YANDEX_API_BASE = 'https://api.music.yandex.net';
const YANDEX_SIGN_KEY = 'p93jhgh689SBReK6ghtw62';
// Клиенты API — чем больше тем лучше, некоторые старые версии не режут треки
const YANDEX_CLIENTS = [
  'YandexMusicAndroid/23095171',
  'YandexMusicAndroid/24023621',
  'YandexMusicDesktop/4.1.1',
  'YandexMusicDesktop/5.0.0',
  'YandexMusicIos/5.0.0',
  'YandexMusicIos/4.0.0',
  'YandexMusicWindows/200',
  ''
];

// Десктопный HMAC-ключ для /get-file-info (взят из YandexMusicBetaMod)
const YANDEX_FILEINFO_KEY = 'kzqU4XhfCaY6B6JTHODeq5';

// HMAC-SHA256 подпись для /get-file-info (точная копия логики YandexMusicBetaMod)
function signGetFileInfo(secretKey, data) {
  return crypto.createHmac('sha256', secretKey).update(data).digest('base64').slice(0, -1);
}

class YandexMusicAPI {
  constructor() {
    this.client = axios.create({
      baseURL: YANDEX_API_BASE,
      headers: {
        'User-Agent': 'Yandex-Music-API',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Yandex-Music-Client': YANDEX_CLIENTS[0]
      },
      timeout: 60000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === 'development'
      })
    });
  }

  logPath() {
    try {
      const { app } = require('electron');
      return path.join(app.getPath('userData'), 'yandex-lyrics-debug.log');
    } catch(e) {
      return path.join(__dirname, 'yandex-lyrics-debug.log');
    }
  }

  debugLog(msg) {
    try {
      const fs = require('fs');
      fs.appendFileSync(this.logPath(), `[${new Date().toISOString()}] ${msg}\n`);
    } catch(e) {}
  }

  // Патч ответа аккаунта — форсим наличие Яндекс.Плюса
  patchPlusStatus(responseData) {
    if (responseData?.result) {
      responseData.result.hasPlus = true;
      responseData.result.subEditor = true;
      responseData.result.plus = { hasPlus: true, isTutorialCompleted: true };
      responseData.result.subscription = {
        ...responseData.result.subscription,
        canStartTrial: false,
        hasActiveTrial: false,
        autoRenewable: false,
        expired: false
      };
    }
    return responseData;
  }

  async validateToken(token) {
    try {
      const response = await this.client.get('/account/status', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      const data = this.patchPlusStatus(response.data);
      const account = data?.result?.account;
      if (account) {
        return { valid: true, user: { name: account.displayName || account.login, login: account.login } };
      }
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  async getAccountStatus(token) {
    try {
      const response = await this.client.get('/account/status', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      return this.patchPlusStatus(response.data);
    } catch (error) {
      console.error('Account status error:', error.message);
      return null;
    }
  }

  async getPlaylistTracks(token, playlistId, type, ownerUid) {
    console.log(`Fetching tracks for playlist ${playlistId}...`);
    
    try {
      const feedResponse = await this.client.get('/feed', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621',
          'Accept-Language': 'ru'
        }
      });
      
      const feed = feedResponse.data.result;
      let trackIds = [];
      
      if (feed.generatedPlaylists) {
        for (const pl of feed.generatedPlaylists) {
          const data = pl.data || pl;
          if (data.kind == playlistId && data.tracks) {
            trackIds = data.tracks.map(t => t.id);
            break;
          }
        }
      }
      
      if (trackIds.length === 0 && feed.days) {
        for (const day of feed.days) {
          if (day.playlists) {
            for (const pl of day.playlists) {
              const data = pl.data || pl;
              if (data.kind == playlistId && data.tracks) {
                trackIds = data.tracks.map(t => t.id);
                break;
              }
            }
          }
          if (trackIds.length > 0) break;
        }
      }
      
      console.log(`Found ${trackIds.length} track IDs for playlist ${playlistId}`);
      
      if (trackIds.length === 0) {
        console.log(`No tracks found in feed for playlist ${playlistId}, trying user playlists...`);
        return this.getUserPlaylistTracks(token, playlistId, ownerUid);
      }
      
      const tracksResponse = await this.client.post('/tracks', trackIds, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const tracks = tracksResponse.data.result || [];
      console.log(`Received ${tracks.length} tracks from API`);
      
      return tracks.map(track => this.formatTrackShort(track)).filter(Boolean);
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error.message);
      return this.getUserPlaylistTracks(token, playlistId, ownerUid);
    }
  }

  async getUserPlaylistTracks(token, playlistId, ownerUid) {
    try {
      const uid = ownerUid || (await this.getAccountStatus(token))?.result?.account?.uid;
      if (!uid) {
        console.error('Could not determine user UID');
        return null;
      }
      
      const response = await this.client.get(`/users/${uid}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const playlist = response.data.result;
      if (!playlist || !playlist.tracks) {
        console.log('No tracks in playlist response');
        return null;
      }
      
      const tracks = playlist.tracks.map(t => t.track || t);
      console.log(`Got ${tracks.length} tracks from user playlist`);
      
      return tracks.map(track => this.formatTrackShort(track)).filter(Boolean);
    } catch (error) {
      console.error(`Error fetching user playlist ${playlistId}:`, error.message);
      return null;
    }
  }

  // Обход Яндекс.Плюса: сначала десктопный /get-file-info (как в YandexMusicBetaMod),
  // при неудаче — мобильный /tracks/{id}/download-info (фоллбэк)
  async getStreamUrl(token, trackId) {
    const desktop = await this.getStreamUrlDesktop(token, trackId);
    if (desktop && desktop.url) {
      this.debugLog(`[stream] ${trackId} -> DESKTOP ok (${desktop.url.split('/')[2]})`);
      return desktop;
    }
    const mobile = await this.getStreamUrlMobile(token, trackId);
    if (mobile && mobile.url) {
      this.debugLog(`[stream] ${trackId} -> MOBILE fallback (${mobile.url.split('/')[2]})`);
      return mobile;
    }
    this.debugLog(`[stream] ${trackId} -> FAILED (both desktop + mobile returned null)`);
    return null;
  }

  // Десктопный эндпоинт (точная копия YandexMusicBetaMod):
  // валидный HMAC доказывает, что мы — десктопное приложение, и сервер отдаёт
  // ПОЛНЫЙ трек даже без Яндекс.Плюса (мобильный API так не умеет).
  async getStreamUrlDesktop(token, trackId) {
    const baseId = String(trackId).split(':')[0];
    const quality = 'lossless';
    const codecs = ['flac', 'aac', 'he-aac', 'mp3', 'flac-mp4', 'aac-mp4', 'he-aac-mp4'];
    const transports = 'encraw';
    const ts = Math.floor(Date.now() / 1000);
    const sign = signGetFileInfo(YANDEX_FILEINFO_KEY, `${ts}${baseId}${quality}${codecs.join('')}${transports}`);
    const headers = {
      'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/5.0.0',
      'X-Yandex-Music-Frontend': 'new',
      'X-Yandex-Music-Without-Invocation-Info': '1',
      'Authorization': `OAuth ${token}`
    };
    const url = `https://api.music.yandex.net/get-file-info?ts=${ts}&trackId=${baseId}&quality=${quality}&codecs=${encodeURIComponent(codecs.join(','))}&transports=${transports}&sign=${encodeURIComponent(sign)}`;
    for (let i = 0; i < 10; i++) {
      try {
        const resp = await axios.get(url, { headers, timeout: 10000, validateStatus: () => true });
        if (resp.status !== 200) { await new Promise(r => setTimeout(r, 150)); continue; }
        const info = resp.data && resp.data.downloadInfo;
        // Яндекс подсовывает рекламу/заглушку (trackId не совпадает) — повторяем
        if (!info || String(info.trackId).split(':')[0] !== baseId) {
          await new Promise(r => setTimeout(r, 150));
          continue;
        }
        const { host, path, ts: its, s } = info;
        if (!host || !path || !its || !s) { await new Promise(r => setTimeout(r, 150)); continue; }
        const secret = 'XGRlBW9FXlekgbPrRHuSiA';
        const md5 = crypto.createHash('md5').update(`${secret}${path}${s}`).digest('hex');
        return { url: `https://${host}/get-mp3/${md5}/${its}${path}` };
      } catch (e) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    return null;
  }

  // Мобильный фоллбэк через /tracks/{id}/download-info (может отдавать превью для бесплатных)
  async getStreamUrlMobile(token, trackId) {
    for (const client of YANDEX_CLIENTS) {
      const headers = { 'Authorization': `OAuth ${token}` };
      if (client) headers['X-Yandex-Music-Client'] = client;
      try {
        const resp = await this.client.get(`/tracks/${trackId}/download-info`, { headers, timeout: 10000 });
        const list = resp.data?.result;
        if (!list || list.length === 0) continue;

        const noPreview = list.filter(e => !e.preview);
        const pool = noPreview.length > 0 ? noPreview : list;
        const mp3pool = pool.filter(e => e.codec === 'mp3');
        const selected = (mp3pool.length > 0 ? mp3pool : pool)
          .sort((a, b) => (b.bitrateInKbps || 0) - (a.bitrateInKbps || 0))[0];

        let entry = selected;
        if (selected.downloadInfoUrl) {
          const detailResp = await axios.get(`${selected.downloadInfoUrl}&format=json`, {
            headers: { 'Authorization': `OAuth ${token}`, 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
          });
          entry = { ...selected, ...detailResp.data };
        }

        const s = entry.s, ts = entry.ts, path = entry.path, host = entry.host;
        if (!host || !path || !ts || !s) continue;

        const secret = 'XGRlBW9FXlekgbPrRHuSiA';
        const url = `https://${host}/get-mp3/${crypto.createHash('md5').update(`${secret}${path}${s}`).digest('hex')}/${ts}${path}`;
        return { url };
      } catch (_) {}
    }
    return null;
  }

  async getUserPlaylists(token, uid = null) {
    try {
      if (!uid) {
        const status = await this.getAccountStatus(token);
        uid = status?.result?.account?.uid;
      }
      if (!uid) return [];
      
      const response = await this.client.get(`/users/${uid}/playlists/list`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const playlists = response.data.result;
      if (!playlists) return [];
      
      const filteredPlaylists = playlists.filter(p => {
        const skipKinds = [3, 4, 6, 8];
        const skipTitles = ['Мне повезёт', 'Ищем новинки', 'Вы слушали', 'Коллекционная', 'Deja Vu', 'Премьера', 'Новинки'];
        return !skipKinds.includes(p.kind) && !skipTitles.includes(p.title);
      });
      
      return filteredPlaylists.map(p => ({
        id: p.kind,
        title: p.title,
        trackCount: p.trackCount,
        cover: p.cover?.uri ? `https://${p.cover.uri.replace('%%', '200x200')}` : null
      }));
    } catch (error) {
      console.error('Error fetching user playlists:', error.message);
      return [];
    }
  }

  async getLikedTracks(token) {
    try {
      const response = await this.client.get('/tracks/favorites', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const liked = response.data.result;
      if (!liked || !liked.tracks) return [];
      
      return liked.tracks.map(t => this.formatTrackShort(t)).filter(Boolean);
    } catch (error) {
      console.error('Error fetching liked tracks:', error.message);
      return [];
    }
  }

  // Промокод Upgrade, реклама и треки-заглушки Яндекса
  isAdTrack(track) {
    if (!track) return true;
    const title = (track.title || '').toLowerCase();
    const artist = (track.artists?.[0]?.name || (track.artists || '')).toLowerCase();
    const adPatterns = ['промокод upgrade', 'промокод', 'upgrade', 'уязвимость в приложении', 
                         'advertisement', 'реклама', 'sponsored', 'промо'];
    // Проверяем название
    for (const p of adPatterns) {
      if (title.includes(p)) return true;
    }
    // Проверяем исполнителя (иногда реклама маскируется под трек)
    for (const p of ['реклама', 'advertisement', 'sponsored']) {
      if (artist.includes(p)) return true;
    }
    // Слишком короткие треки (< 5 сек) — почти наверняка реклама/заглушка
    const duration = track.durationMs || track.duration || 0;
    if (duration > 0 && duration < 5000) return true;
    return false;
  }

  formatTrackShort(track) {
    if (this.isAdTrack(track)) return null;
    return {
      id: track.id,
      trackId: track.id,
      title: track.title || 'Без названия',
      artists: track.artists?.map(a => a.name).join(', ') || 'Неизвестный исполнитель',
      duration: track.durationMs || 0,
      album: track.albums?.[0]?.title || 'Неизвестный альбом',
      cover: track.coverUri ? `https://${track.coverUri.replace('%%', '200x200')}` : null,
      explicit: (typeof track.contentWarning === 'string' && track.contentWarning.toLowerCase() === 'explicit')
        || track.explicit === true
        || track.explicit === 'explicit'
        || track.explicit === 1
        || track.albums?.[0]?.explicit === true
        || false
    };
  }

  async searchArtists(token, query) {
    try {
      const response = await this.client.get('/search', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        },
        params: {
          text: query,
          type: 'artist',
          page: 0,
          'page-size': 10
        }
      });
      
      return response.data.result?.artists?.results || [];
    } catch (error) {
      console.error('Error searching artists:', error.message);
      return [];
    }
  }

  async getArtistAlbums(token, artistId) {
    try {
      const response = await this.client.get(`/artists/${artistId}/albums`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        },
        params: {
          page: 0,
          pageSize: 20
        }
      });
      
      return response.data.result?.albums || [];
    } catch (error) {
      console.error('Error fetching artist albums:', error.message);
      return [];
    }
  }

  async getAlbumTracks(token, albumId) {
    try {
      const response = await this.client.get(`/albums/${albumId}/with-tracks`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const album = response.data.result;
      if (!album || !album.volumes) return [];
      
      const tracks = [];
      for (const volume of album.volumes) {
        for (const track of volume) {
          const formatted = this.formatTrackShort(track);
          if (formatted) tracks.push(formatted);
        }
      }
      
      return {
        albumTitle: album.title,
        tracks
      };
    } catch (error) {
      console.error('Error fetching album tracks:', error.message);
      return [];
    }
  }

  async getPlaylistInfo(token, playlistId) {
    try {
      const status = await this.getAccountStatus(token);
      const uid = status?.result?.account?.uid;
      if (!uid) return null;
      
      const response = await this.client.get(`/users/${uid}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const playlist = response.data.result;
      if (!playlist) return null;
      
      return {
        id: playlist.kind,
        title: playlist.title,
        trackCount: playlist.trackCount,
        cover: playlist.cover?.uri ? `https://${playlist.cover.uri.replace('%%', '200x200')}` : null
      };
    } catch (error) {
      console.error('Error getting playlist info:', error.message);
      return null;
    }
  }

  async getPlaylistTracksByKind(token, kind, uid) {
    try {
      const response = await this.client.get(`/users/${uid}/playlists/${kind}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      
      const playlist = response.data.result;
      if (!playlist || !playlist.tracks) return { tracks: [] };
      
      const tracks = playlist.tracks.map(t => t.track || t);
      return {
        playlistId: kind,
        tracks: tracks.map(track => this.formatTrackShort(track)).filter(Boolean),
        playlistTitle: playlist.title || 'Плейлист'
      };
    } catch (error) {
      console.error(`Error fetching playlist by kind ${kind}:`, error.message);
      return { tracks: [] };
    }
  }

  async search(token, query) {
    try {
      const response = await this.client.get('/search', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        },
        params: { text: query, type: 'all', page: 0, 'page-size': 10 }
      });
      return response.data.result;
    } catch (error) {
      console.error('Search error:', error.message);
      return null;
    }
  }

  async getRecommendations(token) {
    try {
      const response = await this.client.get('/feed', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      return response.data.result;
    } catch (error) {
      console.error('Recommendations error:', error.message);
      return null;
    }
  }

  // Персональные подборки из /feed: «Дежавю», «Плейлист дня», «Премьера», микс дня и т.д.
  async getRecommendationMixes(token) {
    try {
      const feedResponse = await this.client.get('/feed', {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621',
          'Accept-Language': 'ru'
        }
      });

      const feed = feedResponse.data.result;
      const rawMixes = [];
      const seen = new Set();

      const pushMix = (entry) => {
        const data = entry.data || entry;
        const kind = data.kind ?? entry.kind;
        if (kind == null) return;
        if (seen.has(String(kind))) return;
        seen.add(String(kind));
        rawMixes.push(data);
      };

      (feed.generatedPlaylists || []).forEach(pushMix);
      (feed.days || []).slice(0, 2).forEach(day => (day.playlists || []).forEach(pushMix));

      if (rawMixes.length === 0) return [];

      const mixes = [];
      for (const mix of rawMixes.slice(0, 16)) {
        const trackIds = (mix.tracks || [])
          .map(t => t && (typeof t === 'string' ? t : t.id))
          .filter(Boolean)
          .slice(0, 60);
        if (trackIds.length === 0) continue;

        let full = [];
        try {
          const tracksResponse = await this.client.post('/tracks', trackIds, {
            headers: {
              'Authorization': `OAuth ${token}`,
              'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
            }
          });
          full = tracksResponse.data.result || [];
        } catch (e) {
          console.error(`Mix "${mix.title}" tracks error:`, e.message);
        }

        const formatted = full.map(t => this.formatTrackShort(t)).filter(Boolean);
        if (formatted.length === 0) continue;

        mixes.push({
          id: mix.kind ?? mix.id,
          uid: mix.uid,
          title: mix.title || 'Микс',
          description: mix.description || '',
          trackCount: formatted.length,
          cover: (formatted.find(t => t.cover) || {}).cover || null,
          type: 'yandex',
          tracks: formatted
        });
      }

      return mixes.slice(0, 12);
    } catch (error) {
      console.error('Recommendation mixes error:', error.message);
      return [];
    }
  }

  async getArtistDetails(token, artistId) {
    try {
      const response = await this.client.get(`/artists/${artistId}`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        }
      });
      return response.data.result;
    } catch (error) {
      console.error('Artist details error:', error.message);
      return null;
    }
  }

  async getArtistTracks(token, artistId, pageSize = 10) {
    try {
      const response = await this.client.get(`/artists/${artistId}/tracks`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621'
        },
        params: { page: 0, pageSize }
      });
      return response.data.result;
    } catch (error) {
      console.error('Artist tracks error:', error.message);
      return null;
    }
  }

  async getLyrics(token, trackId) {
    this.debugLog(`getLyrics called for trackId=${trackId}`);
    try {
      const rawId = String(trackId).split(':')[0];
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${rawId}${timestamp}`;
      const sign = crypto.createHmac('sha256', YANDEX_SIGN_KEY).update(message).digest('base64');

      this.debugLog(`Request: /tracks/${rawId}/lyrics format=LRC ts=${timestamp}`);

      // Шаг 1: получаем downloadUrl через подписанный endpoint
      const response = await this.client.get(`/tracks/${rawId}/lyrics`, {
        params: { format: 'LRC', timeStamp: timestamp, sign },
        headers: { 'Authorization': `OAuth ${token}` }
      });

      this.debugLog(`Response status: ${response.status}`);

      const result = response.data.result;
      if (!result || !result.downloadUrl) {
        this.debugLog('No downloadUrl in response');
        return null;
      }

      this.debugLog(`Got downloadUrl: ${result.downloadUrl.slice(0, 100)}...`);

      // Шаг 2: скачиваем текст по downloadUrl
      const dlResp = await axios.get(result.downloadUrl, {
        headers: { 'User-Agent': 'Yandex-Music-API' },
        timeout: 15000,
        responseType: 'text'
      });

      this.debugLog(`Download status: ${dlResp.status}, length: ${(dlResp.data || '').length}`);

      let lyricsText = typeof dlResp.data === 'string' ? dlResp.data : String(dlResp.data || '');
      lyricsText = lyricsText.trim();
      if (!lyricsText) {
        this.debugLog('Empty lyrics text');
        return null;
      }

      let syncedText = null;
      let plainText = null;

      // Проверяем на LRC-формат
      if (/\[\d{2}:\d{2}[\.:]\d{2}\]/.test(lyricsText)) {
        syncedText = lyricsText;
        plainText = lyricsText.replace(/\[\d{2}:\d{2}[\.:]\d{2}\]\s*/g, '').trim();
      } else {
        plainText = lyricsText;
      }

      this.debugLog(`Success: plain=${plainText.length} chars, synced=${!!syncedText}`);
      return { plain: plainText, synced: syncedText, source: 'yandex' };
    } catch (error) {
      this.debugLog(`ERROR: ${error.message}`);
      if (error.response) {
        this.debugLog(`Status: ${error.response.status}, data: ${JSON.stringify(error.response.data).slice(0, 300)}`);
      }
      return null;
    }
  }
}

module.exports = new YandexMusicAPI();