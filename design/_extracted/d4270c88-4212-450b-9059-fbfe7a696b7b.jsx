// ─── Settings Page ───────────────────────────────────────────────────────────

const SettingsSubnav = ({ active, onChange }) => {
  const items = [
    { k: 'tags', l: 'Tags', i: '#' },
    { k: 'vars', l: 'Variables Drawer', i: '🌸' },
    { k: 'appearance', l: 'Appearance', i: '◐', dim: true },
    { k: 'shortcuts', l: 'Shortcuts', i: '⌘', dim: true },
    { k: 'export', l: 'Export / Import', i: '⇅', dim: true },
  ];
  return (
    <aside style={{ width: 200, borderRight: '1px solid var(--gray-200)',
      padding: '20px 12px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)',
        letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px 10px' }}>
        Settings
      </div>
      {items.map(it => (
        <button key={it.k}
          onClick={() => !it.dim && onChange(it.k)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 'var(--radius-sm)',
            background: it.k===active ? 'var(--gray-100)' : 'none',
            color: it.dim ? 'var(--gray-300)' : (it.k===active ? 'var(--black)' : 'var(--gray-600)'),
            fontSize: 13, fontWeight: it.k===active ? 500 : 400,
            border: 'none', cursor: it.dim ? 'not-allowed' : 'pointer',
            textAlign: 'left', marginBottom: 2,
          }}>
          <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{it.i}</span>
          <span style={{ flex: 1 }}>{it.l}</span>
          {it.dim && <span style={{ fontSize: 9, color: 'var(--gray-300)' }}>soon</span>}
        </button>
      ))}
    </aside>
  );
};

const TagsSection = () => {
  // Aggregate tags from PROMPTS_DATA
  const counts = React.useMemo(() => {
    const m = {};
    PROMPTS_DATA.forEach(p => p.tags.forEach(t => {
      const slug = t.replace(/^#/, '');
      m[slug] = (m[slug] || 0) + 1;
    }));
    // include orphan examples
    if (!m['legacy_alpha']) m['legacy_alpha'] = 0;
    if (!m['snake_case']) m['snake_case'] = 0;
    return m;
  }, []);
  const [adding, setAdding] = React.useState(false);
  const [newTag, setNewTag] = React.useState('');
  const [hoverTag, setHoverTag] = React.useState(null);
  const [confirmTag, setConfirmTag] = React.useState(null);
  const valid = /^[a-z][a-z0-9_]*$/.test(newTag);

  const sortedSlugs = Object.keys(counts).sort();

  return (
    <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Tags</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3 }}>
            {sortedSlugs.length} tags · snake_case · sorted alphabetically
          </div>
        </div>
        <button onClick={() => setAdding(true)} style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--gray-200)', background: 'none',
          color: 'var(--gray-600)', fontSize: 14, cursor: 'pointer',
        }}>+</button>
      </div>

      {adding && (
        <div style={{ marginBottom: 16,
          border: '1px solid var(--sakura)', boxShadow: '0 0 0 3px var(--sakura-soft)',
          borderRadius: 'var(--radius)', padding: '10px 12px' }}>
          <input autoFocus value={newTag} onChange={e => setNewTag(e.target.value)}
            placeholder="new_tag_slug"
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gray-800)',
            }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 10.5, color: newTag && !valid ? '#B33' : 'var(--gray-400)',
              fontFamily: 'var(--font-mono)' }}>
              Use snake_case (lowercase letters, digits, underscores; must start with a letter).
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setAdding(false); setNewTag(''); }} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--gray-600)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                padding: '5px 12px', background: 'none', cursor: 'pointer',
              }}>Cancel</button>
              <button disabled={!valid} onClick={() => { setAdding(false); setNewTag(''); }} style={{
                fontSize: 12, fontWeight: 500,
                color: valid ? 'var(--white)' : 'var(--gray-400)',
                border: `1px solid ${valid ? 'var(--black)' : 'var(--gray-200)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '5px 12px',
                background: valid ? 'var(--black)' : 'var(--gray-100)',
                cursor: valid ? 'pointer' : 'not-allowed',
              }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}>
        {sortedSlugs.map(slug => {
          const count = counts[slug];
          const deletable = count === 0;
          const tooltip = hoverTag === slug && !deletable;
          return (
            <div key={slug}
              onMouseEnter={() => setHoverTag(slug)} onMouseLeave={() => setHoverTag(null)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 100px',
                alignItems: 'center', padding: '10px 14px',
                borderBottom: '1px solid var(--gray-100)',
                background: hoverTag === slug ? 'var(--gray-50)' : 'var(--white)',
              }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gray-800)' }}>
                #{slug}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                used by {count} item{count===1?'':'s'}
              </span>
              <div style={{ position: 'relative', justifySelf: 'end' }}>
                <button disabled={!deletable}
                  onClick={() => deletable && setConfirmTag(slug)}
                  style={{
                    fontSize: 11, fontWeight: 500,
                    color: deletable ? 'var(--gray-800)' : 'var(--gray-300)',
                    border: `1px solid ${deletable ? 'var(--gray-200)' : 'var(--gray-100)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '4px 12px',
                    background: deletable ? 'var(--white)' : 'var(--gray-50)',
                    cursor: deletable ? 'pointer' : 'not-allowed',
                  }}>Delete</button>
                {tooltip && (
                  <div style={{
                    position: 'absolute', top: -34, right: 0,
                    background: 'var(--gray-800)', color: 'var(--white)',
                    fontSize: 11, padding: '5px 9px', borderRadius: 5,
                    whiteSpace: 'nowrap', zIndex: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                  }}>
                    Used by {count} items. Reassign or remove from items first.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--gray-400)' }}>
        Renaming is not available in v1. Create a new tag, reassign items, then delete the old one.
      </div>

      {confirmTag && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ width: 360, background: 'var(--white)',
            border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
            padding: '20px 20px 16px',
            boxShadow: '0 16px 50px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Delete tag «<span style={{ fontFamily: 'var(--font-mono)' }}>{confirmTag}</span>»?
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 16 }}>
              This cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={() => setConfirmTag(null)} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--gray-600)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
                padding: '6px 12px', background: 'none', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => setConfirmTag(null)} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--white)',
                border: '1px solid var(--black)', borderRadius: 'var(--radius-sm)',
                padding: '6px 12px', background: 'var(--black)', cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VariablesDefaultsSection = () => {
  const [minLen, setMinLen] = React.useState(1);
  const [maxLen, setMaxLen] = React.useState(120);
  return (
    <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxWidth: 720 }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
        Variables Drawer
      </div>
      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3, marginBottom: 22 }}>
        Defaults applied to every prompt unless overridden by environment variables.
      </div>

      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
        padding: '20px 22px', background: 'var(--gray-50)' }}>
        {[
          { l: 'MIN_VAR_LENGTH', v: minLen, set: setMinLen, min: 0, max: 20 },
          { l: 'MAX_VAR_LENGTH', v: maxLen, set: setMaxLen, min: 20, max: 500 },
        ].map(s => (
          <div key={s.l} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--gray-800)', fontWeight: 500 }}>{s.l}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#C45E78' }}>{s.v}</span>
            </div>
            <input type="range" min={s.min} max={s.max} value={s.v}
              onChange={e => s.set(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--sakura)' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>{s.min}</span>
              <span style={{ fontSize: 10, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>{s.max}</span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
            env override: SAKURA_MIN_VAR / SAKURA_MAX_VAR
          </span>
          <button onClick={() => { setMinLen(1); setMaxLen(120); }} style={{
            fontSize: 11.5, fontWeight: 500, color: 'var(--gray-600)',
            border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)',
            padding: '5px 11px', background: 'var(--white)', cursor: 'pointer',
          }}>Reset to defaults</button>
        </div>
      </div>

      <div style={{ marginTop: 22, padding: '14px 16px',
        background: 'var(--sakura-soft)', border: '1px solid rgba(255,183,197,0.4)',
        borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#C45E78', marginBottom: 4 }}>
          How this is applied
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--gray-800)', lineHeight: 1.55 }}>
          Each variable input shows <span style={{ fontFamily: 'var(--font-mono)' }}>{`{N} / {MAX}`}</span> below it
          and blocks the Copy button when out of range. No red borders or inline error styling.
        </div>
      </div>
    </div>
  );
};

const Settings = ({ onExit }) => {
  const [section, setSection] = React.useState('tags');
  return (
    <div style={{ flex: 1, display: 'flex', background: 'var(--white)',
      overflow: 'hidden', position: 'relative' }}>
      <SettingsSubnav active={section} onChange={setSection}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 24px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onExit} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
            fontSize: 12, color: 'var(--gray-600)',
            border: '1px solid var(--gray-200)', background: 'none', cursor: 'pointer',
          }}>← Back to prompts</button>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Settings</span>
        </div>
        {section === 'tags' ? <TagsSection/> : <VariablesDefaultsSection/>}
      </div>
    </div>
  );
};

Object.assign(window, { Settings });
