import React, { useState } from 'react';
import BackgroundPaths from './ui/BackgroundPaths';
import './EmailAuth.css';

const authTranslations = {
  ru: {
    title: 'Flowmusic',
    subtitle: 'Введите почту — код подтверждения придёт на неё',
    email_placeholder: 'example@mail.ru',
    send_code: 'Получить код',
    sending: 'Отправляем код...',
    code_title: 'Введите код',
    code_subtitle: 'Мы отправили 6-значный код на {email}',
    code_placeholder: '• • • • • •',
    verify: 'Войти',
    verifying: 'Проверяем...',
    back: 'Назад',
    resend: 'Отправить повторно',
    sent: 'Код отправлен! Проверьте почту.',
    spam_hint: 'Не пришло? Загляните в папку «Спам»',
    dev_hint: 'Dev: SMTP не настроен, код — {code}',
    error_generic: 'Что-то пошло не так, попробуйте ещё раз'
  },
  en: {
    title: 'Flowmusic',
    subtitle: 'Enter your email — a confirmation code will be sent there',
    email_placeholder: 'example@mail.com',
    send_code: 'Get code',
    sending: 'Sending code...',
    code_title: 'Enter the code',
    code_subtitle: 'We sent a 6-digit code to {email}',
    code_placeholder: '• • • • • •',
    verify: 'Sign in',
    verifying: 'Verifying...',
    back: 'Back',
    resend: 'Resend',
    sent: 'Code sent! Check your inbox.',
    spam_hint: "Didn't get it? Check your Spam folder",
    dev_hint: 'Dev: SMTP not configured, code is {code}',
    error_generic: 'Something went wrong, please try again'
  }
};

function EmailAuth({ onAuth, language, onLanguageChange }) {
  const tt = (key) => authTranslations[language || 'ru']?.[key] || key;
  const [step, setStep] = useState('email'); // email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [devCode, setDevCode] = useState(null);

  const handleSendCode = async (e) => {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const result = await window.electron.auth.sendCode(value);
      if (result.success) {
        setEmail(value);
        setStep('code');
        setInfo(tt('sent'));
        if (result.devCode) setDevCode(result.devCode);
      } else {
        setError(result.error || tt('error_generic'));
      }
    } catch (err) {
      setError(err.message || tt('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.auth.verifyCode(email, code.trim());
      if (result.success) {
        await window.electron.auth.saveSession({ email: result.email, token: result.token });
        onAuth(result.email, result.token);
      } else {
        setError(result.error || tt('error_generic'));
      }
    } catch (err) {
      setError(err.message || tt('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
  };

  return (
    <div className="email-auth">
      <BackgroundPaths
        title={tt('title')}
        subtitle={step === 'email' ? tt('subtitle') : tt('code_title')}
      >
        <div className="email-auth-panel">
          {step === 'email' ? (
            <form className="email-auth-form" onSubmit={handleSendCode}>
              <input
                type="email"
                className="email-auth-input"
                placeholder={tt('email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
              {error && <div className="email-auth-error">{error}</div>}
              <button
                type="submit"
                className="email-auth-btn"
                disabled={loading || !email.trim()}
              >
                {loading ? tt('sending') : tt('send_code')}
              </button>
            </form>
          ) : (
            <form className="email-auth-form" onSubmit={handleVerify}>
              <p className="email-auth-code-sub">
                {tt('code_subtitle').replace('{email}', email)}
              </p>
              {info && <div className="email-auth-info">{info}</div>}
              {info && <div className="email-auth-spam">{tt('spam_hint')}</div>}
              {devCode && (
                <div className="email-auth-dev">
                  {tt('dev_hint').replace('{code}', devCode)}
                </div>
              )}
              {error && <div className="email-auth-error">{error}</div>}
              <input
                type="text"
                inputMode="numeric"
                className="email-auth-input email-auth-code-input"
                placeholder={tt('code_placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                className="email-auth-btn"
                disabled={loading || code.trim().length < 4}
              >
                {loading ? tt('verifying') : tt('verify')}
              </button>
              <button
                type="button"
                className="email-auth-back"
                onClick={resetToEmail}
                disabled={loading}
              >
                {tt('back')}
              </button>
            </form>
          )}
        </div>
      </BackgroundPaths>

      <button
        type="button"
        className="email-auth-lang"
        onClick={() => onLanguageChange?.(language === 'en' ? 'ru' : 'en')}
      >
        <span className={language === 'ru' ? 'active' : ''}>RU</span>
        <span className="email-auth-lang-div">/</span>
        <span className={language === 'en' ? 'active' : ''}>EN</span>
      </button>
    </div>
  );
}

export default EmailAuth;
