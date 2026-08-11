import React from 'react';

const authTranslations = {
  ru: {
    title: 'VK Музыка',
    subtitle: 'Подключите VK для доступа к музыке без рекламы',
    token_placeholder: 'Вставьте VK токен',
    button: 'Войти',
    loading: 'Подключение...',
    help_title: 'Как получить токен:',
    help_steps: [
      'Нажмите кнопку "Получить токен" ниже',
      'Авторизуйтесь в VK',
      'Скопируйте access_token из адресной строки',
      'Вставьте токен выше'
    ],
    features: [
      'Музыка без рекламы',
      'Доступ к вашей аудиотеке',
      'Поиск по всему каталогу VK',
      'Прямое воспроизведение MP3'
    ]
  },
  en: {
    title: 'VK Music',
    subtitle: 'Connect VK to access ad-free music',
    token_placeholder: 'Paste your VK token',
    button: 'Sign In',
    loading: 'Connecting...',
    help_title: 'How to get token:',
    help_steps: [
      'Click "Get Token" button below',
      'Authorize with VK',
      'Copy access_token from address bar',
      'Paste token above'
    ],
    features: [
      'Ad-free music',
      'Access your audio library',
      'Search entire VK catalog',
      'Direct MP3 playback'
    ]
  }
};

function VkAuth({ onAuth, loading, error, language }) {
  const [token, setToken] = React.useState('');
  const tt = (key) => authTranslations[language || 'ru']?.[key] || key;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      onAuth(token.trim());
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🎶</span>
          <h1 style={{ color: '#0077FF' }}>{tt('title')}</h1>
        </div>
        <p className="auth-subtitle">{tt('subtitle')}</p>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="auth-input"
            placeholder={tt('token_placeholder')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          />
          <div className="button-group">
            <button
              type="submit"
              className="submit-button vk-button"
              disabled={loading || !token.trim()}
            >
              {loading ? tt('loading') : tt('button')}
            </button>
          </div>
        </form>

        <div className="auth-features">
          <ul>
            {tt('features').map((feat, i) => (
              <li key={i}>{feat}</li>
            ))}
          </ul>
        </div>

        <div className="auth-help">
          <p><strong>{tt('help_title')}</strong></p>
          <ol>
            {tt('help_steps').map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default VkAuth;
