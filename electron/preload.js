const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  player: {
    saveState: (state) => ipcRenderer.invoke('player:saveState', state),
    getState: () => ipcRenderer.invoke('player:getState')
  },
  yandex: {
    validateToken: (t) => ipcRenderer.invoke('yandex:validate-token', t),
    getToken: () => ipcRenderer.invoke('yandex:get-token'),
    saveToken: (t) => ipcRenderer.invoke('yandex:save-token', t),
    getPlaylists: (t) => ipcRenderer.invoke('yandex:get-playlists', t),
    getPlaylistTracks: (t, id, type, uid) => ipcRenderer.invoke('yandex:get-playlist-tracks', t, id, type, uid),
    getRecommendations: (t) => ipcRenderer.invoke('yandex:get-recommendations', t),
    search: (t, q) => ipcRenderer.invoke('yandex:search', t, q),
    searchArtists: (t, q) => ipcRenderer.invoke('yandex:search-artists', t, q),
    getArtistDetails: (t, id) => ipcRenderer.invoke('yandex:artist-details', t, id),
    getArtistTracks: (t, id, pageSize) => ipcRenderer.invoke('yandex:artist-tracks', t, id, pageSize),
    getStreamUrl: (t, id) => ipcRenderer.invoke('yandex:get-stream-url', t, id),
    oauthLogin: () => ipcRenderer.invoke('yandex:oauth-login')
  },
  favorites: {
    get: () => ipcRenderer.invoke('favorites:get'),
    add: (track) => ipcRenderer.invoke('favorites:add', track),
    remove: (id) => ipcRenderer.invoke('favorites:remove', id)
  },
  playlists: {
    getAll: () => ipcRenderer.invoke('playlists:getAll'),
    create: (name) => ipcRenderer.invoke('playlists:create', name),
    delete: (id) => ipcRenderer.invoke('playlists:delete', id),
    addTrack: (plId, track) => ipcRenderer.invoke('playlists:addTrack', plId, track),
    removeTrack: (plId, trackId) => ipcRenderer.invoke('playlists:removeTrack', plId, trackId),
    import: (payload) => ipcRenderer.invoke('playlists:import', payload)
  },
  share: {
    create: (payload) => ipcRenderer.invoke('share:create', payload),
    get: (code) => ipcRenderer.invoke('share:get', code)
  },
  mini: {
    open: () => ipcRenderer.invoke('mini:open'),
    close: () => ipcRenderer.invoke('mini:close'),
    push: (state) => ipcRenderer.invoke('mini:push', state),
    resize: (size) => ipcRenderer.invoke('mini:resize', size),
    command: (cmd) => ipcRenderer.invoke('mini:command', cmd),
    onUpdate: (cb) => {
      const handler = (e, state) => cb(state);
      ipcRenderer.on('mini:update', handler);
      return () => ipcRenderer.removeListener('mini:update', handler);
    },
    onCommand: (cb) => {
      const handler = (e, cmd) => cb(cmd);
      ipcRenderer.on('main:command', handler);
      return () => ipcRenderer.removeListener('main:command', handler);
    }
  },
  lyrics: {
    get: (trackId, trackName, artistName, albumName, duration) => 
      ipcRenderer.invoke('lyrics:get', trackId, trackName, artistName, albumName, duration),
    saveCustom: (trackId, lyrics) => ipcRenderer.invoke('lyrics:saveCustom', trackId, lyrics),
    getCustom: (trackId) => ipcRenderer.invoke('lyrics:getCustom', trackId),
    deleteCustom: (trackId) => ipcRenderer.invoke('lyrics:deleteCustom', trackId),
    clearCache: () => ipcRenderer.invoke('lyrics:clearCache')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings)
  },
  dialog: {
    selectGif: () => ipcRenderer.invoke('dialog:select-gif'),
    selectAvatar: () => ipcRenderer.invoke('dialog:select-avatar')
  },
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:read-text')
  },
  localTracks: {
    select: () => ipcRenderer.invoke('localTracks:select'),
    getAll: () => ipcRenderer.invoke('localTracks:getAll'),
    remove: (id) => ipcRenderer.invoke('localTracks:remove', id),
    clear: () => ipcRenderer.invoke('localTracks:clear')
  },
  discord: {
    setActivity: (activity) => ipcRenderer.invoke('discord:set-activity', activity)
  },
  vk: {
    request: (method, token, params) => ipcRenderer.invoke('vk:request', method, token, params),
    getToken: () => ipcRenderer.invoke('vk:get-token'),
    saveToken: (t) => ipcRenderer.invoke('vk:save-token', t)
  },
  auth: {
    sendCode: (email) => ipcRenderer.invoke('auth:send-code', email),
    verifyCode: (email, code) => ipcRenderer.invoke('auth:verify-code', email, code),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    saveSession: (session) => ipcRenderer.invoke('auth:save-session', session),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  nickname: {
    getCooldown: () => ipcRenderer.invoke('nickname:get-cooldown'),
    set: (name) => ipcRenderer.invoke('nickname:set', name)
  },
  /* ОТКЛЮЧЁН (Gemini): мост AI
  ai: {
    chat: (payload) => ipcRenderer.invoke('ai:chat', payload)
  },
  */
  device: {
    getId: () => ipcRenderer.invoke('device:getId')
  },
  subscription: {
    getPrice: () => ipcRenderer.invoke('subscription:getPrice'),
    status: () => ipcRenderer.invoke('subscription:status'),
    createPayment: () => ipcRenderer.invoke('subscription:createPayment'),
    checkStatus: (invId) => ipcRenderer.invoke('subscription:checkStatus', invId),
    checkActive: () => ipcRenderer.invoke('subscription:checkActive'),
    openUrl: (url) => ipcRenderer.invoke('subscription:openUrl', url),
    activateCode: (code) => ipcRenderer.invoke('subscription:activateCode', code)
  },
  onShortcut: (cb) => {
    const listeners = {
      playpause: () => cb('playpause'),
      next: () => cb('next'),
      previous: () => cb('previous'),
      search: () => cb('search'),
      lyrics: () => cb('lyrics'),
      saveplaylist: () => cb('saveplaylist'),
      settings: () => cb('settings')
    };

    ipcRenderer.on('shortcut:playpause', listeners.playpause);
    ipcRenderer.on('shortcut:next', listeners.next);
    ipcRenderer.on('shortcut:previous', listeners.previous);
    ipcRenderer.on('shortcut:search', listeners.search);
    ipcRenderer.on('shortcut:lyrics', listeners.lyrics);
    ipcRenderer.on('shortcut:saveplaylist', listeners.saveplaylist);
    ipcRenderer.on('shortcut:settings', listeners.settings);

    return () => {
      ipcRenderer.removeListener('shortcut:playpause', listeners.playpause);
      ipcRenderer.removeListener('shortcut:next', listeners.next);
      ipcRenderer.removeListener('shortcut:previous', listeners.previous);
      ipcRenderer.removeListener('shortcut:search', listeners.search);
      ipcRenderer.removeListener('shortcut:lyrics', listeners.lyrics);
      ipcRenderer.removeListener('shortcut:saveplaylist', listeners.saveplaylist);
      ipcRenderer.removeListener('shortcut:settings', listeners.settings);
    };
  }
});
