// ─── Sidebar Component ───────────────────────────────────────────────────────

const SidebarSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '5px 12px', fontSize: '10px',
          fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--gray-400)', transition: 'color 0.15s',
          background: 'none', border: 'none', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--gray-600)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}
      >
        <span>{title}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s'
        }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div style={{ marginTop: '2px' }}>{children}</div>}
    </div>
  );
};

const NavItem = ({ label, icon, active, onClick, count }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      width: '100%', padding: '6px 12px', fontSize: '13px',
      fontWeight: active ? '500' : '400',
      color: active ? 'var(--black)' : 'var(--gray-600)',
      background: active ? 'var(--gray-100)' : 'none',
      borderRadius: 'var(--radius-sm)',
      transition: 'all 0.15s', border: 'none', cursor: 'pointer',
      textAlign: 'left'
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--black)'; }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-600)'; }}}
  >
    <span style={{ fontSize: '13px', opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {count !== undefined && (
      <span style={{
        fontSize: '10px', fontWeight: '500', color: 'var(--gray-400)',
        background: 'var(--gray-100)', borderRadius: '10px',
        padding: '1px 6px', minWidth: '18px', textAlign: 'center'
      }}>{count}</span>
    )}
  </button>
);

// Cherry blossom branch SVG illustration
const CherryBranch = () => (
  <svg viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', maxWidth: '180px', opacity: 0.6 }}>
    {/* Main branch */}
    <path d="M10 100 Q40 90 70 70 Q100 50 140 40 Q160 35 175 30"
      stroke="#888" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Sub branches */}
    <path d="M70 70 Q75 55 85 45" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M100 57 Q105 40 115 32" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M130 44 Q130 28 138 20" stroke="#888" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <path d="M55 76 Q50 62 55 50" stroke="#888" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    {/* Blossoms - main branch */}
    {[
      [85, 44, 5], [88, 48, 4], [82, 47, 4],
      [115, 31, 5], [119, 34, 4], [112, 34, 4],
      [138, 19, 5], [142, 22, 4], [135, 22, 4],
      [55, 49, 5], [59, 52, 4], [52, 53, 4],
      [40, 83, 4.5], [145, 35, 4], [160, 28, 4],
      [170, 26, 3.5], [105, 55, 3.5]
    ].map(([cx, cy, r], i) => (
      <g key={i} transform={`translate(${cx},${cy})`}>
        {[0,72,144,216,288].map((a, pi) => (
          <ellipse key={pi}
            cx={Math.cos((a-90)*Math.PI/180)*r*0.7}
            cy={Math.sin((a-90)*Math.PI/180)*r*0.7}
            rx={r*0.55} ry={r*0.35}
            transform={`rotate(${a})`}
            fill="#FFB7C5" opacity="0.75"
          />
        ))}
        <circle cx="0" cy="0" r="1.2" fill="#fff9" />
      </g>
    ))}
    {/* Falling petals */}
    {[
      [95, 65, 12], [108, 72, -8], [72, 85, 15],
      [125, 60, -5], [150, 55, 10]
    ].map(([cx, cy, rot], i) => (
      <ellipse key={`fp${i}`} cx={cx} cy={cy}
        rx="3.5" ry="2.2" transform={`rotate(${rot}, ${cx}, ${cy})`}
        fill="#FFB7C5" opacity="0.4" />
    ))}
  </svg>
);

const Sidebar = ({ activeFilter, onFilterChange, promptCounts, onOpenSettings }) => {
  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--gray-200)',
      background: 'var(--white)',
      overflow: 'hidden'
    }}>
      {/* Logo / Brand */}
      <div style={{
        padding: '16px 14px 14px', borderBottom: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: '9px'
      }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px',
          background: 'var(--sakura-soft)', border: '1px solid var(--sakura)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', flexShrink: 0, lineHeight: '26px',
          textAlign: 'center', overflow: 'hidden',
        }}>
          <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>🌸</span>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '-0.01em' }}>Sakura Studio</div>
          <div style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '1px' }}>Prompt Manager</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)', padding: '6px 9px', transition: 'all 0.15s'
        }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--sakura)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="var(--gray-400)" strokeWidth="1.2"/>
            <path d="M8.5 8.5L10.5 10.5" stroke="var(--gray-400)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search…"
            style={{
              border: 'none', background: 'none', outline: 'none',
              fontSize: '12px', color: 'var(--black)', width: '100%'
            }}
            onChange={e => onFilterChange({ type: 'search', query: e.target.value })}
          />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 0' }}>
        <SidebarSection title="Home" defaultOpen={true}>
          <NavItem label="All Prompts" icon="◈" active={activeFilter.type === 'all'}
            onClick={() => onFilterChange({ type: 'all' })}
            count={promptCounts.all} />
          <NavItem label="Favorites" icon="♡" active={activeFilter.type === 'favorites'}
            onClick={() => onFilterChange({ type: 'favorites' })}
            count={promptCounts.favorites} />
        </SidebarSection>

        <SidebarSection title="Templates" defaultOpen={true}>
          {['Planes', 'Test', 'Debug', 'n8n'].map(sub => (
            <NavItem key={sub} label={sub}
              icon={sub === 'Planes' ? '▦' : sub === 'Test' ? '◎' : sub === 'Debug' ? '⬡' : '⟳'}
              active={activeFilter.type === 'subcategory' && activeFilter.value === sub}
              onClick={() => onFilterChange({ type: 'subcategory', value: sub })}
              count={promptCounts[sub] || 0}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Agents" defaultOpen={true}>
          <NavItem label="PR.md" icon="⌥"
            active={activeFilter.type === 'subcategory' && activeFilter.value === 'PR.md'}
            onClick={() => onFilterChange({ type: 'subcategory', value: 'PR.md' })}
            count={promptCounts['PR.md'] || 0}
          />
        </SidebarSection>

        <SidebarSection title="Skills" defaultOpen={true}>
          <NavItem label="All Skills" icon="✦"
            active={activeFilter.type === 'category' && activeFilter.value === 'Skills'}
            onClick={() => onFilterChange({ type: 'category', value: 'Skills' })}
            count={promptCounts['Skills'] || 0}
          />
        </SidebarSection>
      </nav>

      {/* Footer with cherry blossom */}
      <div style={{
        padding: '8px 8px 8px',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px'
      }}>
        <button onClick={onOpenSettings} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', fontSize: 13, color: 'var(--gray-600)',
          background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--black)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-600)'; }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>⚙</span>
          <span style={{ flex: 1 }}>Settings</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <CherryBranch />
        {/* Zen indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '10px', color: 'var(--gray-400)'
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--sakura)', boxShadow: '0 0 6px var(--sakura)',
            animation: 'zen-pulse 2.5s ease-in-out infinite'
          }}></div>
          <span>In flow</span>
        </div>
        </div>
      </div>

      <style>{`
        @keyframes zen-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 4px var(--sakura); }
          50% { opacity: 1; box-shadow: 0 0 10px var(--sakura); }
        }
      `}</style>
    </aside>
  );
};

Object.assign(window, { Sidebar });
