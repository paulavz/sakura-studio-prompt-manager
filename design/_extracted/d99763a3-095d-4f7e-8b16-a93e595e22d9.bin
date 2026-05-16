// ─── History Drawer ──────────────────────────────────────────────────────────

const HistoryDrawer = ({ prompt, open, onClose, onRestore }) => {
  const [confirmIdx, setConfirmIdx] = React.useState(null);
  React.useEffect(() => { if (!open) setConfirmIdx(null); }, [open]);
  if (!prompt) return null;

  const versions = (window.VERSION_HISTORY && window.VERSION_HISTORY[prompt.id]) || [
    { ts: 'May 11, 2026 · 14:32', preview: prompt.content.slice(0, 140), current: true },
    { ts: 'May 10, 2026 · 09:14', preview: prompt.content.slice(0, 140) },
    { ts: 'May 08, 2026 · 18:02', preview: prompt.content.slice(0, 140) },
  ];

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)',
        backdropFilter: 'blur(2px)', zIndex: 200,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }}/>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '360px',
        background: 'var(--white)', borderLeft: '1px solid var(--gray-200)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.08)' : 'none',
        zIndex: 201, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Version History</span>
            <button onClick={onClose} style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gray-200)', background: 'none',
              color: 'var(--gray-400)', fontSize: 14, cursor: 'pointer',
            }}>×</button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 3 }}>
            {versions.length} / 50 versions stored
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versions.map((v, i) => (
            <div key={i} style={{
              border: `1px solid ${i===0 ? 'rgba(255,183,197,0.4)' : 'var(--gray-200)'}`,
              borderRadius: 'var(--radius)', padding: '10px 12px',
              background: i===0 ? 'rgba(255,183,197,0.10)' : 'var(--white)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, color: 'var(--gray-400)',
                  fontFamily: 'var(--font-mono)' }}>{v.ts}</span>
                {i === 0 ? (
                  <span style={{ fontSize: 9.5, color: '#C45E78', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>current</span>
                ) : (
                  <button onClick={() => setConfirmIdx(i)} style={{
                    fontSize: 10.5, fontWeight: 500, color: 'var(--gray-800)',
                    border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                    padding: '3px 9px', background: 'var(--white)', cursor: 'pointer',
                  }}>Restore</button>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--gray-800)', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                maxHeight: 42, overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
                {v.preview.slice(0, 140)}…
              </div>
            </div>
          ))}
        </div>
        {confirmIdx !== null && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div style={{ width: 300, background: 'var(--white)',
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
              padding: '16px 18px 14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Restore this version?
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)',
                lineHeight: 1.5, marginBottom: 14 }}>
                Your current changes will be discarded.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button onClick={() => setConfirmIdx(null)} style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--gray-600)',
                  border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px', background: 'none', cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={() => { onRestore && onRestore(versions[confirmIdx]); setConfirmIdx(null); }} style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--white)',
                  border: '1px solid var(--black)', borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px', background: 'var(--black)', cursor: 'pointer',
                }}>Restore</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

Object.assign(window, { HistoryDrawer });
