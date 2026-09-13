import React from 'react';

export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS = {
  flat: { gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  rock: { gains: [5, 4, 3, 1, 0, 0, 1, 3, 4, 5] },
  pop: { gains: [-2, -1, 1, 3, 4, 4, 2, 0, -1, -2] },
  jazz: { gains: [3, 2, 1, 0, -1, 0, 1, 2, 3, 4] },
  bass: { gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  electronic: { gains: [4, 3, 1, 0, -2, 1, 2, 3, 4, 5] },
  vocal: { gains: [-3, -2, -1, 0, 2, 4, 4, 2, 0, -1] },
};

function fmtFreq(f) {
  return f >= 1000 ? `${f / 1000}k` : `${f}`;
}

// Панель эквалайзера: 10 полос, пресеты, вкл/выкл. Сами gains живут в settings.
export default function EqualizerPanel({ t, settings, onToggle, onPreset, onGain, onReset, onClose }) {
  const gains = Array.isArray(settings?.eqGains) && settings.eqGains.length === 10
    ? settings.eqGains
    : EQ_PRESETS.flat.gains;
  const enabled = settings?.eqEnabled === true;
  const activePreset = settings?.eqPreset || 'custom';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal eq-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('eq_title')}</h3>
        <label className="eq-enable-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span>{t('eq_enable')}</span>
        </label>
        <div className="eq-presets">
          {Object.keys(EQ_PRESETS).map(name => (
            <button
              key={name}
              type="button"
              className={`eq-preset-btn ${activePreset === name ? 'active' : ''}`}
              onClick={() => onPreset(name)}
            >
              {t(`eq_preset_${name}`)}
            </button>
          ))}
        </div>
        <div className={`eq-bands ${enabled ? '' : 'disabled'}`}>
          {EQ_FREQS.map((f, i) => (
            <div key={f} className="eq-band">
              <span className="eq-gain-val">{gains[i] > 0 ? `+${gains[i]}` : gains[i]}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={gains[i]}
                disabled={!enabled}
                onChange={(e) => onGain(i, Number(e.target.value))}
                className="eq-slider"
                aria-label={`${fmtFreq(f)} Hz`}
              />
              <span className="eq-freq">{fmtFreq(f)}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onReset}>{t('eq_reset')}</button>
          <button type="button" className="modal-btn create" onClick={onClose}>{t('modal_done') || 'OK'}</button>
        </div>
      </div>
    </div>
  );
}
