import React, { useState } from 'react';

// Модалка шаринга плейлиста: вкладка "Поделиться" (код для своего плейлиста)
// и "Получить" (импорт чужого плейлиста по коду).
export default function ShareModal({ t, playlist, onClose, onImported }) {
  const [tab, setTab] = useState(playlist ? 'give' : 'get');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [found, setFound] = useState(null);
  const [copied, setCopied] = useState(false);

  const makeCode = async () => {
    if (!playlist || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await window.electron.share.create({ name: playlist.name, tracks: playlist.tracks });
      if (res?.success) {
        setCode(res.code);
      } else {
        setError(res?.error || t('share_error'));
      }
    } catch (e) {
      setError(e.message || t('share_error'));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lookup = async () => {
    const c = inputCode.trim().toUpperCase();
    if (c.length !== 6) {
      setError(t('share_code_invalid'));
      return;
    }
    setBusy(true);
    setError('');
    setFound(null);
    try {
      const res = await window.electron.share.get(c);
      if (res?.success) {
        setFound({ name: res.name, tracks: res.tracks || [] });
      } else {
        setError(res?.error || t('share_notfound'));
      }
    } catch (e) {
      setError(e.message || t('share_error'));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!found || busy) return;
    setBusy(true);
    setError('');
    try {
      const pl = await window.electron.playlists.import({ name: found.name, tracks: found.tracks });
      if (onImported) onImported(pl);
    } catch (e) {
      setError(e.message || t('share_error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('share_title')}</h3>
        <div className="share-tabs">
          <button
            type="button"
            className={`share-tab ${tab === 'give' ? 'active' : ''}`}
            onClick={() => setTab('give')}
            disabled={!playlist}
          >
            {t('share_tab_give')}
          </button>
          <button
            type="button"
            className={`share-tab ${tab === 'get' ? 'active' : ''}`}
            onClick={() => setTab('get')}
          >
            {t('share_tab_get')}
          </button>
        </div>

        {tab === 'give' && (
          <div className="share-pane">
            {!playlist ? (
              <p className="share-hint">{t('share_open_playlist')}</p>
            ) : code ? (
              <>
                <p className="share-hint">{t('share_code_hint')}</p>
                <div className="share-code-big" onClick={copyCode} title={t('share_copy')}>{code}</div>
                <button type="button" className="modal-btn create" onClick={copyCode}>
                  {copied ? t('share_copied') : t('share_copy')}
                </button>
              </>
            ) : (
              <>
                <p className="share-hint">{playlist.name} · {playlist.tracks.length} {t('main_playlist_tracks')}</p>
                <button type="button" className="modal-btn create" onClick={makeCode} disabled={busy}>
                  {busy ? t('main_loading') : t('share_get_code')}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'get' && (
          <div className="share-pane">
            <input
              type="text"
              className="modal-input share-code-input"
              placeholder={t('share_code_ph')}
              value={inputCode}
              maxLength={8}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }}
              autoFocus
            />
            <button type="button" className="modal-btn create" onClick={lookup} disabled={busy}>
              {busy ? t('main_loading') : t('share_find')}
            </button>
            {found && (
              <div className="share-found">
                <div className="share-found-name">{found.name}</div>
                <div className="share-found-meta">{found.tracks.length} {t('main_playlist_tracks')}</div>
                <button type="button" className="modal-btn create" onClick={doImport} disabled={busy}>
                  {t('share_import')}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="share-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>
  );
}
