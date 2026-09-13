import React, { useEffect, useRef, useState } from 'react';
import './AIAssistant.css';

const HISTORY_KEY = 'flowmusic_ai_history_v1';
const MAX_HISTORY = 50;

function trackLabel(tr) {
  if (!tr) return '';
  const artists = typeof tr.artists === 'string' ? tr.artists : '';
  return `${tr.title || 'Без названия'}${artists ? ` — ${artists}` : ''}`;
}

function systemPrompt(lang, mode, ctx) {
  if (lang === 'en') {
    if (mode === 'describe') return 'You are a music expert. Describe the playlist mood, genres and vibe briefly. Suggest a catchy name. Reply in English.';
    if (mode === 'recommend') return 'You are a music recommender. Suggest tracks strictly as "Artist — Title", one per line, no extra commentary except a one-line intro. Reply in English.';
    return `You are FlowMusic assistant. Answer briefly in English. Current context: ${ctx}`;
  }
  if (mode === 'describe') return 'Ты — музыкальный эксперт. Кратко опиши настроение, жанры и вайб плейлиста. Предложи цепляющее название. Отвечай по-русски.';
  if (mode === 'recommend') return 'Ты — музыкальный рекомендатель. Предлагай треки строго в формате «Исполнитель — Название», по одному на строку, в начале — одна строка вступления. Отвечай по-русски.';
  return `Ты — ассистент FlowMusic. Отвечай кратко по-русски. Текущий контекст: ${ctx}`;
}

export default function AIAssistant({ t, settings, currentTrack, selectedPlaylist, tracks, favorites, onOpenSettings }) {
  const lang = settings?.language === 'en' ? 'en' : 'ru';
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(-MAX_HISTORY) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [recommendQuery, setRecommendQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const hasKey = !!settings?.geminiApiKey;
  const tr = (k, fb) => (t ? t(k) : k) === k ? fb : t(k);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, mode, result]);

  const callAi = async (msgs, purpose) => {
    const res = await window.electron?.ai?.chat?.({ messages: msgs, purpose });
    if (!res) throw new Error(lang === 'en' ? 'AI bridge unavailable' : 'AI-мост недоступен');
    if (!res.success) {
      const err = new Error(res.error || 'AI error');
      err.code = res.code;
      throw err;
    }
    return res.reply;
  };

  const contextLine = () => {
    const parts = [];
    if (currentTrack) parts.push(`${lang === 'en' ? 'Now playing' : 'Сейчас играет'}: ${trackLabel(currentTrack)}`);
    if (selectedPlaylist?.name) parts.push(`${lang === 'en' ? 'Playlist' : 'Плейлист'}: ${selectedPlaylist.name}`);
    return parts.join('. ') || (lang === 'en' ? 'no context' : 'без контекста');
  };

  const librarySnapshot = (limit = 30) => {
    const seen = new Set();
    const out = [];
    const push = (tr) => {
      const label = trackLabel(tr);
      if (!label || seen.has(label)) return;
      seen.add(label);
      if (out.length < limit) out.push(label);
    };
    (favorites || []).forEach(push);
    const pool = selectedPlaylist?.name ? [] : (tracks || []);
    pool.forEach(push);
    return out;
  };

  const sendChat = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    const next = [...messages.slice(-MAX_HISTORY + 1), { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await callAi(
        [{ role: 'system', content: systemPrompt(lang, 'chat', contextLine()) }, ...next.slice(-12)],
        'chat'
      );
      setMessages([...next, { role: 'assistant', content: reply }].slice(-MAX_HISTORY));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const describePlaylist = async () => {
    if (loading) return;
    setError('');
    setResult('');
    const list = (selectedPlaylist?.name ? [] : (tracks || [])).slice(0, 40).map(trackLabel).filter(Boolean);
    const favs = (favorites || []).slice(0, 10).map(trackLabel).filter(Boolean);
    if (list.length === 0 && favs.length === 0 && !selectedPlaylist?.name) {
      setError(lang === 'en' ? 'Open a playlist or add favorites first' : 'Сначала откройте плейлист или добавьте любимые треки');
      return;
    }
    setLoading(true);
    try {
      const body = [
        `${lang === 'en' ? 'Playlist' : 'Плейлист'}: ${selectedPlaylist?.name || (lang === 'en' ? 'my library' : 'моя библиотека')}`,
        list.length ? `${lang === 'en' ? 'Tracks' : 'Треки'}:\n- ${list.join('\n- ')}` : '',
        favs.length ? `${lang === 'en' ? 'Favorites' : 'Любимое'}:\n- ${favs.join('\n- ')}` : '',
      ].filter(Boolean).join('\n\n');
      const reply = await callAi(
        [{ role: 'system', content: systemPrompt(lang, 'describe') }, { role: 'user', content: body }],
        'describe'
      );
      setResult(reply);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const recommend = async () => {
    const q = recommendQuery.trim();
    if (!q || loading) return;
    setError('');
    setResult('');
    setLoading(true);
    try {
      const snap = librarySnapshot();
      const body = [
        `${lang === 'en' ? 'Request' : 'Запрос'}: ${q}`,
        currentTrack ? `${lang === 'en' ? 'Now playing' : 'Сейчас играет'}: ${trackLabel(currentTrack)}` : '',
        snap.length ? `${lang === 'en' ? 'My library sample' : 'Пример моей библиотеки'}:\n- ${snap.join('\n- ')}` : '',
      ].filter(Boolean).join('\n\n');
      const reply = await callAi(
        [{ role: 'system', content: systemPrompt(lang, 'recommend') }, { role: 'user', content: body }],
        'recommend'
      );
      setResult(reply);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  };

  if (!hasKey) {
    return (
      <div className="ai-panel">
        <div className="ai-empty">
          <div className="ai-empty-icon">🤖</div>
          <h2>{tr('ai_title', 'AI')}</h2>
          <p>{tr('ai_no_key_gm', lang === 'en' ? 'Add your free Google AI Studio key to enable AI' : 'Добавьте бесплатный ключ Google AI Studio, чтобы включить AI')}</p>
          <button type="button" className="ai-primary-btn" onClick={() => onOpenSettings?.()}>
            {tr('ai_open_settings', lang === 'en' ? 'Open Settings → Token' : 'Открыть Настройки → Токен')}
          </button>
          <span className="ai-hint">aistudio.google.com → Get API key → AIza...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h2>🤖 {tr('ai_title', 'AI')}</h2>
        <div className="ai-modes">
          {[
            { id: 'chat', label: tr('ai_chat', lang === 'en' ? 'Chat' : 'Чат') },
            { id: 'describe', label: tr('ai_describe', lang === 'en' ? 'Description' : 'Описание') },
            { id: 'recommend', label: tr('ai_recommend', lang === 'en' ? 'Recommendations' : 'Рекомендации') },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              className={`ai-mode-btn ${mode === m.id ? 'active' : ''}`}
              onClick={() => { setMode(m.id); setError(''); }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="ai-error">⚠️ {error}</div>}

      {mode === 'chat' && (
        <>
          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="ai-placeholder">
                {tr('ai_chat_hint', lang === 'en' ? 'Ask about music, moods, artists…' : 'Спросите про музыку, настроение, исполнителей…')}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                <div className="ai-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg-assistant">
                <div className="ai-bubble ai-typing">{tr('ai_thinking', lang === 'en' ? 'Thinking…' : 'Думаю…')}</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="ai-input-row">
            <input
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder={tr('ai_placeholder_chat', lang === 'en' ? 'Message…' : 'Сообщение…')}
              disabled={loading}
            />
            <button type="button" className="ai-primary-btn" onClick={sendChat} disabled={loading || !input.trim()}>
              {tr('ai_send', lang === 'en' ? 'Send' : 'Отправить')}
            </button>
            {messages.length > 0 && (
              <button type="button" className="ai-ghost-btn" onClick={clearChat} disabled={loading}>
                {tr('ai_clear', lang === 'en' ? 'Clear' : 'Очистить')}
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'describe' && (
        <div className="ai-tool">
          <p className="ai-tool-desc">
            {selectedPlaylist?.name
              ? `${tr('ai_describe_for', lang === 'en' ? 'Describe playlist' : 'Описать плейлист')}: ${selectedPlaylist.name}`
              : tr('ai_describe_library', lang === 'en' ? 'Describe my library / favorites' : 'Описать мою библиотеку / любимое')}
          </p>
          <button type="button" className="ai-primary-btn" onClick={describePlaylist} disabled={loading}>
            {loading ? tr('ai_thinking', lang === 'en' ? 'Thinking…' : 'Думаю…') : tr('ai_describe_btn', lang === 'en' ? 'Generate description' : 'Сгенерировать описание')}
          </button>
          {result && <div className="ai-result">{result}</div>}
        </div>
      )}

      {mode === 'recommend' && (
        <div className="ai-tool">
          <div className="ai-input-row">
            <input
              className="ai-input"
              value={recommendQuery}
              onChange={(e) => setRecommendQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') recommend(); }}
              placeholder={tr('ai_placeholder_recommend', lang === 'en' ? 'Mood, genre, activity… e.g. evening lo-fi' : 'Настроение, жанр, занятие… например вечерний ло-фай')}
              disabled={loading}
            />
            <button type="button" className="ai-primary-btn" onClick={recommend} disabled={loading || !recommendQuery.trim()}>
              {loading ? tr('ai_thinking', lang === 'en' ? 'Thinking…' : 'Думаю…') : tr('ai_recommend_btn', lang === 'en' ? 'Recommend' : 'Подобрать')}
            </button>
          </div>
          {result && <div className="ai-result">{result}</div>}
        </div>
      )}
    </div>
  );
}
