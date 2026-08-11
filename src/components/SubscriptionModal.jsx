import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLOSE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const CROWN_ICON = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.5">
    <path d="M2 19h20M4 19V7l6 5 2-8 2 8 6-5v12" />
  </svg>
);

const CHECK_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const LOCK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export default function SubscriptionModal({ isOpen, onClose, subscriptionActive, subscriptionEndDate, onSubscriptionChange }) {
  const [step, setStep] = useState('info'); // info | processing | success | error
  const [price, setPrice] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [invId, setInvId] = useState(null);
  const [message, setMessage] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [code, setCode] = useState('');
  const [codeActivating, setCodeActivating] = useState(false);
  const [codeMessage, setCodeMessage] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setPaymentUrl(null);
      setInvId(null);
      setMessage('');
      setCode('');
      setCodeMessage(null);
      loadPrice();
    }
  }, [isOpen]);

  const loadPrice = async () => {
    try {
      const p = await window.electron.subscription.getPrice();
      setPrice(p);
    } catch (err) {
      setPrice({ price: 99, currency: 'RUB', days: 30, label: '99 ₽/мес' });
    }
  };

  const handleBuy = async () => {
    setStep('processing');
    setMessage('Создание ссылки на оплату...');

    try {
      const result = await window.electron.subscription.createPayment();

      if (result.success && result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setInvId(result.invId);
        setMessage('Открываем страницу оплаты...');

        // Open in default browser
        window.electron.subscription.openUrl(result.paymentUrl);

        setStep('success');
        setMessage('Страница оплаты открыта в браузере. После оплаты нажмите "Проверить оплату".');
      } else {
        setStep('error');
        setMessage(result.error || 'Не удалось создать ссылку на оплату');
      }
    } catch (err) {
      setStep('error');
      setMessage(err.message || 'Ошибка соединения с сервером');
    }
  };

  const handleCheckPayment = async () => {
    if (!invId) return;
    setCheckingPayment(true);
    setMessage('Проверка оплаты...');

    try {
      const result = await window.electron.subscription.checkStatus(invId);

      if (result.paid) {
        setStep('info');
        setMessage('✅ Оплата подтверждена! Подписка активирована.');
        onSubscriptionChange?.();
        setTimeout(() => onClose(), 2000);
      } else {
        setMessage('❌ Оплата ещё не найдена. Если вы уже оплатили, подождите несколько минут и нажмите "Проверить" снова.');
      }
    } catch (err) {
      setMessage('Ошибка при проверке: ' + err.message);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleActivateCode = async () => {
    if (!code.trim()) return;
    setCodeActivating(true);
    setCodeMessage(null);

    try {
      const result = await window.electron.subscription.activateCode(code.trim());

      if (result.success) {
        setCodeMessage({ type: 'success', text: `✅ Подписка активирована на ${result.days} дней!` });
        setCode('');
        onSubscriptionChange?.();
        setTimeout(() => onClose(), 2500);
      } else {
        setCodeMessage({ type: 'error', text: `❌ ${result.error || 'Не удалось активировать код'}` });
      }
    } catch (err) {
      setCodeMessage({ type: 'error', text: '❌ Ошибка соединения с сервером' });
    } finally {
      setCodeActivating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const daysLeft = subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="subscription-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="subscription-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button className="subscription-close" onClick={onClose}>{CLOSE_ICON}</button>

            <div className="subscription-header">
              <div className="crown-icon">{CROWN_ICON}</div>
              <h2>FlowMusic Premium</h2>
            </div>

            {subscriptionActive ? (
              /* ─── Active subscription ─── */
              <div className="subscription-body">
                <div className="subscription-status-badge active">
                  <span>✓</span> Подписка активна
                </div>
                {subscriptionEndDate && (
                  <p className="subscription-info-text">
                    Действует до: <strong>{formatDate(subscriptionEndDate)}</strong>
                    {daysLeft > 0 && ` (осталось ${daysLeft} дн.)`}
                  </p>
                )}

                <div className="premium-features-list">
                  <h4>Ваши привилегии:</h4>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Кастомные темы оформления</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> High Quality Audio</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Экспорт плейлистов</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Статистика прослушиваний</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Приоритетная поддержка</div>
                </div>

                <div className="subscription-divider">
                  <span>продлить</span>
                </div>

                <div className="code-activation-block">
                  <h4 className="code-activation-title">🎟 Продлить подписку</h4>
                  <div className="code-activation-row">
                    <input
                      className="code-activation-input"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleActivateCode(); }}
                      disabled={codeActivating}
                    />
                    <button
                      className="code-activation-btn"
                      onClick={handleActivateCode}
                      disabled={codeActivating || !code.trim()}
                    >
                      {codeActivating ? 'Продлеваем...' : 'Продлить'}
                    </button>
                  </div>
                  {codeMessage && (
                    <p className={`code-activation-message ${codeMessage.type}`}>
                      {codeMessage.text}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ─── No subscription ─── */
              <div className="subscription-body">
                <p className="subscription-subtitle">
                  Откройте все возможности FlowMusic
                </p>

                {price && (
                  <div className="subscription-price-block">
                    <span className="subscription-price">{price.price} <span className="currency">₽</span></span>
                    <span className="subscription-period">/ месяц</span>
                  </div>
                )}

                <div className="premium-features-list">
                  <h4>С подпиской вы получите:</h4>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Кастомные темы — меняйте внешний вид плеера</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> High Quality Audio — слушайте в лучшем качестве</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Экспорт плейлистов в JSON/CSV</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Детальная статистика прослушиваний</div>
                  <div className="feature-item"><span className="feature-check">{CHECK_ICON}</span> Приоритетная поддержка</div>
                </div>

                {step === 'success' && message && (
                  <div className="subscription-message success">
                    {message}
                    <button
                      className="subscription-check-btn"
                      onClick={handleCheckPayment}
                      disabled={checkingPayment}
                    >
                      {checkingPayment ? 'Проверка...' : '✅ Проверить оплату'}
                    </button>
                  </div>
                )}

                {step === 'error' && (
                  <div className="subscription-message error">
                    {message}
                    <button className="subscription-retry-btn" onClick={handleBuy}>
                      Попробовать снова
                    </button>
                  </div>
                )}

                {step === 'processing' && (
                  <div className="subscription-message info">
                    <div className="spinner-small" />
                    {message}
                  </div>
                )}

                <button
                  className="subscription-buy-btn"
                  onClick={handleBuy}
                  disabled={step === 'processing'}
                >
                  {step === 'processing' ? 'Создание ссылки...' : `Купить за ${price ? price.price : '99'} ₽`}
                </button>

                <div className="subscription-divider">
                  <span>или</span>
                </div>

                <div className="code-activation-block">
                  <h4 className="code-activation-title">🎟 Есть код активации?</h4>
                  <div className="code-activation-row">
                    <input
                      className="code-activation-input"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleActivateCode(); }}
                      disabled={codeActivating}
                    />
                    <button
                      className="code-activation-btn"
                      onClick={handleActivateCode}
                      disabled={codeActivating || !code.trim()}
                    >
                      {codeActivating ? 'Активация...' : 'Активировать'}
                    </button>
                  </div>
                  {codeMessage && (
                    <p className={`code-activation-message ${codeMessage.type}`}>
                      {codeMessage.text}
                    </p>
                  )}
                </div>

                <p className="subscription-note">
                  Оплата через Robokassa. После оплаты подписка активируется автоматически.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
