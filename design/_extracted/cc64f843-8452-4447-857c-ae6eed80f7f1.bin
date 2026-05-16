// ─── Main App Component ───────────────────────────────────────────────────────

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sakuraPink": "#FFB7C5",
  "cardLayout": "single",
  "sidebarWidth": 224,
  "fontSize": 13.5,
  "zenMode": false
}/*EDITMODE-END*/;

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [activeFilter, setActiveFilter] = React.useState({ type: 'all' });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedPrompt, setSelectedPrompt] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [route, setRoute] = React.useState('app'); // 'app' | 'settings'
  const [petalTrigger, setPetalTrigger] = React.useState(0);

  // Favorite state lifted here so toggling works live
  const [favorites, setFavorites] = React.useState(
    () => new Set(PROMPTS_DATA.filter(p => p.favorite).map(p => p.id))
  );

  const promptsWithFavs = React.useMemo(() =>
    PROMPTS_DATA.map(p => ({ ...p, favorite: favorites.has(p.id) })),
    [favorites]
  );

  const handleToggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // Keep selectedPrompt in sync
    setSelectedPrompt(prev => prev?.id === id
      ? { ...prev, favorite: !favorites.has(id) }
      : prev
    );
  };

  // Compute sidebar counts
  const promptCounts = React.useMemo(() => {
    const counts = { all: promptsWithFavs.length, favorites: 0 };
    promptsWithFavs.forEach(p => {
      if (p.favorite) counts.favorites++;
      if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [promptsWithFavs]);

  const handleFilterChange = (filter) => {
    if (filter.type === 'search') {
      setSearchQuery(filter.query);
      setActiveFilter({ type: 'all' });
    } else {
      setActiveFilter(filter);
      setSearchQuery('');
    }
    setSelectedPrompt(null);
    setDrawerOpen(false);
  };

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setDrawerOpen(false);
  };

  const handleCopy = () => {
    setPetalTrigger(t => t + 1);
  };

  // Apply sakura color as CSS var
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sakura', tweaks.sakuraPink);
    const hex = tweaks.sakuraPink.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty('--sakura-soft', `rgba(${r},${g},${b},0.15)`);
    document.documentElement.style.setProperty('--sakura-glow', `rgba(${r},${g},${b},0.4)`);
    document.documentElement.style.setProperty('--sidebar-w', `${tweaks.sidebarWidth}px`);
  }, [tweaks.sakuraPink, tweaks.sidebarWidth]);

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      overflow: 'hidden', background: 'var(--white)',
      fontSize: `${tweaks.fontSize}px`,
    }}>
      <PetalRain trigger={petalTrigger} />

      {/* Sidebar */}
      {!tweaks.zenMode && (
        <Sidebar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          promptCounts={promptCounts}
          onOpenSettings={() => setRoute('settings')}
        />
      )}

      {route === 'settings' ? (
        <Settings onExit={() => setRoute('app')} />
      ) : (
        <>
      {/* Gallery */}
      <Gallery
        prompts={promptsWithFavs}
        activePromptId={selectedPrompt?.id}
        onSelectPrompt={handleSelectPrompt}
        onToggleFavorite={handleToggleFavorite}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
      />

      {/* Prompt Viewer */}
      <PromptViewer
        prompt={selectedPrompt}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onCopy={handleCopy}
        onSaveTriggerPetals={handleCopy}
        sakuraPink={tweaks.sakuraPink}
      />
        </>
      )}

      {/* History Drawer */}
      <HistoryDrawer
        prompt={selectedPrompt}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Variables Drawer */}
      <VariablesDrawer
        prompt={selectedPrompt}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCopy={handleCopy}
      />

      {/* Tweaks Panel */}
      <TweaksPanel>
        <TweakSection label="Sakura">
          <TweakColor
            label="Color Sakura"
            value={tweaks.sakuraPink}
            onChange={v => setTweak('sakuraPink', v)}
          />
          <TweakSlider
            label="Tamaño de fuente"
            value={tweaks.fontSize}
            min={11} max={16} step={0.5} unit="px"
            onChange={v => setTweak('fontSize', v)}
          />
          <TweakSlider
            label="Ancho del sidebar"
            value={tweaks.sidebarWidth}
            min={180} max={300} step={4} unit="px"
            onChange={v => setTweak('sidebarWidth', v)}
          />
        </TweakSection>
        <TweakSection label="Vista">
          <TweakToggle
            label="Modo Zen (sin sidebar)"
            value={tweaks.zenMode}
            onChange={v => setTweak('zenMode', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};
