import { useState, useEffect } from 'react';

const DisclaimerBanner = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('shetvaidya_disclaimer_dismissed');
    if (dismissed) setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: 'linear-gradient(135deg, #fff8e1, #ffecb3)',
        border: '2px solid #f9a825',
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '16px',
        color: '#5d4037',
        fontWeight: 600,
        fontSize: '0.92rem',
        boxShadow: '0 4px 12px rgba(249,168,37,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ lineHeight: 1.45 }}>
        <strong style={{ color: '#e65100', fontSize: '1.05rem' }}>⚠️ Demo Preview — No Live Backend</strong>
        <br />
        This is a demonstration interface only. No backend server is connected; all features shown are for preview purposes and may not reflect live data or functionality.
      </div>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem('shetvaidya_disclaimer_dismissed', '1');
          setVisible(false);
        }}
        style={{
          flexShrink: 0,
          padding: '6px 14px',
          borderRadius: '8px',
          border: 'none',
          background: '#f57f17',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '0.82rem',
        }}
      >
        Dismiss
      </button>
    </div>
  );
};

export default DisclaimerBanner;
