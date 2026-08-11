// VK Music API - ad-free streaming via Electron IPC
class VkMusicAPI {
  constructor() {
    this.accessToken = null;
  }

  setToken(token) {
    this.accessToken = token;
  }

  async request(method, params = {}) {
    const data = await window.electron.vk.request(method, this.accessToken, params);
    console.log(`[VK API] ${method}:`, data);

    if (data.error) {
      throw new Error(data.error.error_msg || `VK API Error ${data.error.error_code}`);
    }
    return data.response;
  }

  async testConnection() {
    try {
      await this.request('users.get');
      return true;
    } catch (err) {
      console.error('VK connection test failed:', err);
      return false;
    }
  }

  async getUserInfo() {
    const users = await this.request('users.get', { fields: 'photo_100' });
    return users[0];
  }

  async searchTracks(query, count = 30) {
    try {
      const result = await this.request('audio.search', {
        q: query,
        count,
        sort: 2
      });

      return (result.items || []).map(track => this.formatTrack(track));
    } catch (err) {
      console.error('VK search error:', err);
      return [];
    }
  }

  async getMyMusic(count = 50, offset = 0) {
    try {
      const result = await this.request('audio.get', { count, offset });
      return (result.items || []).map(track => this.formatTrack(track));
    } catch (err) {
      console.error('VK get music error:', err);
      return [];
    }
  }

  async getPopular(count = 50) {
    try {
      const result = await this.request('audio.getPopular', { count });
      return (result || []).map(track => this.formatTrack(track));
    } catch (err) {
      console.error('VK get popular error:', err);
      return [];
    }
  }

  async getRecommendations(count = 50) {
    try {
      const result = await this.request('audio.getRecommendations', { count });
      return (result.items || []).map(track => this.formatTrack(track));
    } catch (err) {
      console.error('VK get recommendations error:', err);
      return [];
    }
  }

  async getPlaylists(ownerId) {
    try {
      const result = await this.request('audio.getPlaylists', {
        owner_id: ownerId,
        count: 50
      });
      return (result.items || []).map(playlist => ({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        cover: playlist.photo?.photo_300 || null,
        count: playlist.count,
        ownerId: playlist.owner_id
      }));
    } catch (err) {
      console.error('VK get playlists error:', err);
      return [];
    }
  }

  async getPlaylistTracks(ownerId, playlistId, count = 100) {
    try {
      const result = await this.request('audio.get', {
        owner_id: ownerId,
        playlist_id: playlistId,
        count
      });
      return (result.items || []).map(track => this.formatTrack(track));
    } catch (err) {
      console.error('VK get playlist tracks error:', err);
      return [];
    }
  }

  getStreamUrl(track) {
    return track.streamUrl || track.url || null;
  }

  formatTrack(track) {
    return {
      id: `vk_${track.owner_id}_${track.id}`,
      title: track.title || 'Unknown',
      artists: track.artist || 'Unknown Artist',
      album: track.album?.title || '',
      duration: (track.duration || 0) * 1000,
      durationMs: (track.duration || 0) * 1000,
      cover: track.album?.thumb?.photo_300 || track.album?.thumb?.photo_600 || null,
      url: track.url || '',
      streamUrl: track.url || '',
      source: 'vk',
      genre: track.genre_id ? `genre_${track.genre_id}` : ''
    };
  }
}

export default new VkMusicAPI();
