// ─── Gallery Component ────────────────────────────────────────────────────────

const PromptCard = ({ prompt, active, onClick, onToggleFavorite }) => {
  const [hovered, setHovered] = React.useState(false);
  const [favHovered, setFavHovered] = React.useState(false);

  const categoryColors = {
    'Templates': '#E8F4FF',
    'Agentes': '#F0F8E8',
    'Skills': '#FFF3E8',
    'Favoritos': '#FFF0F5',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--white)',
        border: `1px solid ${active ? 'transparent' : hovered ? 'transparent' : 'var(--gray-200)'}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: active
          ? `0 0 0 2px var(--sakura), 0 4px 20px var(--sakura-glow)`
          : hovered
          ? `0 0 0 1px var(--sakura), 0 8px 24px var(--sakura-glow), 0 2px 8px rgba(0,0,0,0.06)`
          : '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
      }}
    >
      {/* Sakura glow overlay on hover */}
      {(hovered || active) && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,183,197,0.06) 0%, transparent 60%)',
          borderRadius: 'var(--radius)', pointerEvents: 'none',
        }} />
      )}

      {/* Top row: title + icons — vertically centered */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <div style={{
          flex: 1, fontSize: '13.5px', fontWeight: '600',
          color: 'var(--black)', letterSpacing: '-0.01em', lineHeight: '1.35',
        }}>
          {prompt.title}
        </div>

        {prompt.hasVariables && (
          <span
            title="This prompt has variables — click 'Use Template' to fill them in"
            style={{ fontSize: '13px', flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >🌸</span>
        )}

        {/* Favorite toggle — visible on hover or when active */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(prompt.id); }}
          onMouseEnter={() => setFavHovered(true)}
          onMouseLeave={() => setFavHovered(false)}
          title={prompt.favorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{
            flexShrink: 0, border: 'none', background: 'none', padding: '0',
            cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center',
            fontSize: '14px',
            color: prompt.favorite ? 'var(--sakura)' : favHovered ? 'var(--sakura)' : 'var(--gray-300)',
            filter: prompt.favorite ? 'drop-shadow(0 0 3px var(--sakura))' : 'none',
            transition: 'color 0.15s, filter 0.15s, opacity 0.15s',
            opacity: (hovered || prompt.favorite) ? 1 : 0,
          }}
        >
          {prompt.favorite ? '♥' : '♡'}
        </button>
      </div>

      {/* Tags — wrap fully, no clipping */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {prompt.tags.map(tag => (
          <span key={tag} style={{
            fontSize: '10px', fontWeight: '500',
            color: prompt.hasVariables ? '#C45E78' : 'var(--gray-600)',
            background: prompt.hasVariables ? 'rgba(255,183,197,0.18)' : 'var(--gray-100)',
            border: `1px solid ${prompt.hasVariables ? 'rgba(255,183,197,0.4)' : 'var(--gray-200)'}`,
            borderRadius: '4px', padding: '2px 6px',
            fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom row: category + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '10px', fontWeight: '500', color: 'var(--gray-600)',
          background: categoryColors[prompt.category] || 'var(--gray-100)',
          borderRadius: '4px', padding: '2px 7px',
          border: '1px solid var(--gray-200)', whiteSpace: 'nowrap',
        }}>
          {prompt.subcategory || prompt.category}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
          {prompt.createdAt}
        </span>
      </div>
    </div>
  );
};

const Gallery = ({ prompts, activePromptId, onSelectPrompt, onToggleFavorite, activeFilter, searchQuery }) => {
  const filtered = React.useMemo(() => {
    let list = [...prompts];
    if (activeFilter.type === 'favorites') {
      list = list.filter(p => p.favorite);
    } else if (activeFilter.type === 'category') {
      list = list.filter(p => p.category === activeFilter.value);
    } else if (activeFilter.type === 'subcategory') {
      list = list.filter(p => p.subcategory === activeFilter.value);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [prompts, activeFilter, searchQuery]);

  const filterLabel = {
    all: 'All Prompts',
    favorites: 'Favorites',
    category: activeFilter.value,
    subcategory: activeFilter.value,
    search: `"${searchQuery}"`,
  }[activeFilter.type] || 'Prompts';

  return (
    <div style={{
      width: '320px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--gray-200)',
      background: 'var(--white)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '-0.01em' }}>
            {filterLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
              {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
            </span>
            <span
              title="Prompts with 🌸 have variables — click 'Use Template' to fill them in"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '10px', color: '#C45E78',
                background: 'rgba(255,183,197,0.15)',
                border: '1px solid rgba(255,183,197,0.3)',
                borderRadius: '4px', padding: '2px 6px',
                lineHeight: 1,
              }}
            >
              <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>🌸</span>
              <span> with variables</span>
            </span>
          </div>
        </div>
        <button
          style={{
            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--gray-200)', background: 'none',
            color: 'var(--gray-400)', fontSize: '13px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--black)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-400)'; }}
          title="New prompt"
        >
          +
        </button>
      </div>

      {/* Card list — padding gives room for box-shadow to breathe */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 16px', gap: '8px',
            color: 'var(--gray-400)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', opacity: 0.4 }}>🌸</div>
            <div style={{ fontSize: '12px' }}>No prompts found</div>
          </div>
        ) : (
          filtered.map(prompt => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              active={prompt.id === activePromptId}
              onClick={() => onSelectPrompt(prompt)}
              onToggleFavorite={onToggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
};

Object.assign(window, { Gallery });
