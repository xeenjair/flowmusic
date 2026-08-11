import React, { useState, useEffect } from 'react';
import './YandexAuth.css';

// Simple translations for YandexAuth
const authTranslations = {
  ru: {
    title: 'Вход в flowmusic',
    subtitle: 'Подключите Яндекс.Музыку для доступа к вашим плейлистам',
    button: 'Подключить аккаунт',
    loading: 'Подключение...',
    error: 'Ошибка подключения',
    success: 'Успешно подключено!'
  },
  en: {
    title: 'Login to flowmusic',
    subtitle: 'Connect Yandex.Music to access your playlists',
    button: 'Connect account',
    loading: 'Connecting...',
    error: 'Connection error',
    success: 'Successfully connected!'
  }
};

function YandexAuth({ onAuth, loading, error, language }) {
  const tt = (key) => authTranslations[language || 'ru']?.[key] || key;
  const [token, setToken] = useState('');

  useEffect(() => {
    // Check clipboard for OAuth URL every 1 second
    const checkClipboard = () => {
      try {
        const clipboardText = window.electron.clipboard.readText();
        if (typeof clipboardText === 'string' && clipboardText.includes('access_token=')) {
          const extracted = extractToken(clipboardText);
          if (extracted && extracted !== token) {
            setToken(extracted);
            // Optional: show notification
            console.log('Токен автоматически вставлен из буфера обмена');
          }
        }
      } catch (err) {
        console.error('Clipboard read error:', err);
      }
    };

    const interval = setInterval(checkClipboard, 1000);
    checkClipboard(); // Check immediately

    return () => clearInterval(interval);
  }, [token]);

  const extractToken = (input) => {
    // Проверяем, не вставил ли пользователь полный URL
    if (input.includes('access_token=')) {
      const match = input.match(/access_token=([^&]+)/);
      return match ? match[1] : input;
    }
    return input;
  };



  const handleTokenChange = (e) => {
    const input = e.target.value;
    setToken(extractToken(input));
  };

  const openYandexOAuth = async () => {
    try {
      const result = await window.electron.yandex.oauthLogin();
      if (result) {
        setToken(result);
        // Авто-подключаем после получения токена
        onAuth(result);
      }
    } catch (err) {
      console.error('OAuth error:', err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{tt('title')}</h1>
        <p className="auth-subtitle">{tt('subtitle')}</p>

        <form onSubmit={(e) => { e.preventDefault(); onAuth(token); }}>
          <div className="form-group">
            <label htmlFor="token">{language === 'en' ? 'Yandex.Music Token' : 'Токен Яндекс.Музыки'}</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={handleTokenChange}
              placeholder={language === 'en' ? 'Enter OAuth token or full URL' : 'Введите OAuth токен или полный URL'}
              disabled={loading}
            />
            <small className="input-hint">
              {language === 'en' ? 'You can paste the full URL with access_token parameter' : 'Можно вставить полный URL с параметром access_token'}
            </small>
          </div>

          {error && (
            <div className="error-message">
              <strong>{language === 'en' ? 'Error:' : 'Ошибка:'}</strong> {error}
            </div>
          )}

          <div className="button-group">
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !token}
            >
              {loading ? tt('loading') : tt('button')}
            </button>

            <button
              type="button"
              className="oauth-button"
              onClick={openYandexOAuth}
            >
              {language === 'en' ? 'Get new token' : 'Получить новый токен'}
            </button>
          </div>
        </form>

        <div className="auth-help">
          <p><strong>{language === 'en' ? 'Token problems?' : 'Проблемы с токеном?'}</strong></p>
          <ol>
            <li>{language === 'en' ? 'Click "Get new token"' : 'Нажмите "Получить новый токен"'}</li>
            <li>{language === 'en' ? 'Log in to Yandex account' : 'Войдите в аккаунт Яндекс'}</li>
            <li>{language === 'en' ? 'After redirect, copy the entire URL' : 'После редиректа скопируйте весь URL'}</li>
            <li>{language === 'en' ? 'Paste it in the field above' : 'Вставьте его в поле выше'}</li>
          </ol>
          <p className="vpn-note">
            ⚠️ {language === 'en' ? 'If you are not in Russia, you may need VPN with Russian IP' : 'Если вы не в России, может потребоваться VPN с российским IP'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default YandexAuth;