// SoundCloud интеграция через официальный Embed Player + Widget API.
// Не требует API-ключа, OAuth и подписки SoundCloud Go+.

const oembedUrl = (trackUrl) =>
  `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(trackUrl)}`;

const isValidSoundCloudUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  // Формат: soundcloud.com/artist/track или soundcloud.com/artist/sets/playlist
  return /^https?:\/\/(www\.)?soundcloud\.com\/[^/?#]+\/[^/?#]+/.test(normalized);
};

// Извлечение относительного пути трека (например: "artist/track")
const extractPath = (url) => {
  const m = url.trim().match(/soundcloud\.com\/([^/?#]+\/[^/?#]+)/);
  return m ? m[1] : null;
};

// Получение метаданных трека через официальный oEmbed endpoint
async function fetchTrackInfo(url) {
  try {
    if (!isValidSoundCloudUrl(url)) {
      throw new Error('Введите корректную ссылку SoundCloud (soundcloud.com/артист/трек)');
    }

    const response = await fetch(oembedUrl(url));
    if (!response.ok) {
      throw new Error('SoundCloud не нашёл этот трек. Проверьте ссылку.');
    }

    const data = await response.json();
    return {
      title: data.title || 'Без названия',
      artists: data.author_name || 'Неизвестный исполнитель',
      cover: data.thumbnail_url || null,
      description: data.description || ''
    };
  } catch (err) {
    throw new Error(err.message || 'Ошибка загрузки трека SoundCloud');
  }
}

export default {
  fetchTrackInfo,
  isValidSoundCloudUrl,
  extractPath
};