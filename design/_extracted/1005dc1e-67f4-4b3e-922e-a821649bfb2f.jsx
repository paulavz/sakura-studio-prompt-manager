// ─── Variables Drawer ─────────────────────────────────────────────────────────

const VariablesDrawer = ({ prompt, open, onClose, onCopy }) => {
  const [values, setValues] = React.useState({});
  const [copyFeedback, setCopyFeedback] = React.useState(false);

  // Reset values when prompt changes
  React.useEffect(() => {
    if (prompt) {
      const initial = {};
      prompt.variables.forEach(v => { initial[v] = ''; });
      setValues(initial);
    }
  }, [prompt?.id]);

  if (!prompt) return null;

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  // Build result by replacing {{variable}} with filled values
  const buildResult = () => {
    let result = prompt.content;
    Object.entries(values).forEach(([key, val]) => {
      if (val) result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    return result;
  };

  const filledCount = Object.values(values).filter(v => v.trim()).length;
  const totalVars = prompt.variables.length;
  const progress = totalVars > 0 ? filledCount / totalVars : 0;

  const handleCopy = () => {
    const result = buildResult().replace(/\*\*/g, '');
    navigator.clipboard.writeText(result).catch(() => {});
    setCopyFeedback(true);
    onCopy();
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Variable label formatting
  const formatLabel = (varName) =>
    varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Multiline vars (those that suggest longer content)
  const isMultiline = (varName) =>
    ['error_message', 'descripcion', 'objetivo', 'contexto'].includes(varName);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.08)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '360px',
        background: 'var(--white)',
        borderLeft: '1px solid var(--gray-200)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.08), -2px 0 10px rgba(0,0,0,0.04)' : 'none',
        zIndex: 201,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--gray-200)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '14px' }}>🌸</span>
              <span style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                Use Template
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '26px', height: '26px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--gray-200)', background: 'none',
                color: 'var(--gray-400)', cursor: 'pointer', fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--black)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-400)'; }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>
            {prompt.title}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '10px', color: 'var(--gray-400)' }}>Variables completed</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#C45E78' }}>
                {filledCount}/{totalVars}
              </span>
            </div>
            <div style={{
              height: '3px', background: 'var(--gray-100)',
              borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: 'var(--sakura)',
                width: `${progress * 100}%`,
                transition: 'width 0.3s ease',
                boxShadow: progress > 0 ? '0 0 6px var(--sakura)' : 'none',
              }} />
            </div>
          </div>
        </div>

        {/* Variables form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prompt.variables.map(varName => {
              const filled = values[varName]?.trim().length > 0;
              return (
                <div key={varName}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '11.5px', fontWeight: '600',
                    color: filled ? '#C45E78' : 'var(--gray-600)',
                    marginBottom: '5px', transition: 'color 0.15s',
                  }}>
                    <span style={{
                      display: 'inline-block', width: '5px', height: '5px',
                      borderRadius: '50%',
                      background: filled ? 'var(--sakura)' : 'var(--gray-300)',
                      transition: 'background 0.15s',
                    }} />
                    {formatLabel(varName)}
                    <code style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9.5px',
                      color: 'var(--gray-400)', background: 'var(--gray-100)',
                      padding: '1px 4px', borderRadius: '3px', marginLeft: '2px',
                    }}>
                      {`{{${varName}}}`}
                    </code>
                  </label>
                  {isMultiline(varName) ? (
                    <textarea
                      value={values[varName] || ''}
                      onChange={e => handleChange(varName, e.target.value)}
                      placeholder={`Enter ${formatLabel(varName).toLowerCase()}…`}
                      rows={3}
                      style={{
                        width: '100%', padding: '8px 10px',
                        fontSize: '12.5px', lineHeight: '1.5',
                        border: `1px solid ${filled ? 'rgba(255,183,197,0.6)' : 'var(--gray-200)'}`,
                        borderRadius: 'var(--radius-sm)',
                        background: filled ? 'rgba(255,183,197,0.04)' : 'var(--gray-50)',
                        outline: 'none', resize: 'vertical',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-ui)',
                        boxShadow: filled ? '0 0 0 3px rgba(255,183,197,0.1)' : 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--sakura)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,183,197,0.15)'; }}
                      onBlur={e => {
                        e.target.style.borderColor = filled ? 'rgba(255,183,197,0.6)' : 'var(--gray-200)';
                        e.target.style.boxShadow = filled ? '0 0 0 3px rgba(255,183,197,0.1)' : 'none';
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[varName] || ''}
                      onChange={e => handleChange(varName, e.target.value)}
                      placeholder={`Enter ${formatLabel(varName).toLowerCase()}…`}
                      style={{
                        width: '100%', padding: '8px 10px',
                        fontSize: '12.5px',
                        border: `1px solid ${filled ? 'rgba(255,183,197,0.6)' : 'var(--gray-200)'}`,
                        borderRadius: 'var(--radius-sm)',
                        background: filled ? 'rgba(255,183,197,0.04)' : 'var(--gray-50)',
                        outline: 'none', transition: 'all 0.15s',
                        boxShadow: filled ? '0 0 0 3px rgba(255,183,197,0.1)' : 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--sakura)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,183,197,0.15)'; }}
                      onBlur={e => {
                        e.target.style.borderColor = filled ? 'rgba(255,183,197,0.6)' : 'var(--gray-200)';
                        e.target.style.boxShadow = filled ? '0 0 0 3px rgba(255,183,197,0.1)' : 'none';
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview */}
          {filledCount > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '8px' }}>
                Result preview
              </div>
              <div style={{
                background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-sm)', padding: '12px',
                fontSize: '11.5px', lineHeight: '1.6',
                fontFamily: 'var(--font-mono)', color: 'var(--gray-600)',
                maxHeight: '180px', overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {buildResult().slice(0, 400)}{buildResult().length > 400 ? '…' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Footer: copy button */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--gray-200)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleCopy}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px', fontWeight: '600',
              background: copyFeedback
                ? 'rgba(255,183,197,0.2)'
                : progress === 1
                ? 'var(--black)'
                : 'var(--gray-100)',
              color: copyFeedback
                ? '#C45E78'
                : progress === 1
                ? 'var(--white)'
                : 'var(--gray-400)',
              border: copyFeedback
                ? '1px solid var(--sakura)'
                : progress === 1
                ? '1px solid var(--black)'
                : '1px solid var(--gray-200)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {copyFeedback ? (
              <>✓ Result copied!</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 9H2C1.45 9 1 8.55 1 8V2C1 1.45 1.45 1 2 1H8C8.55 1 9 1.45 9 2V3" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Copy Result
              </>
            )}
          </button>
          {progress < 1 && totalVars > 0 && (
            <div style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--gray-300)', marginTop: '6px' }}>
              Complete all variables to copy
            </div>
          )}
        </div>
      </div>
    </>
  );
};

Object.assign(window, { VariablesDrawer });
