// ─── Markdown Renderer ───────────────────────────────────────────────────────

const renderMarkdown = (text, sakuraPink) => {
  if (!text) return '';
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  const result = [];
  let key = 0;

  const flushCode = () => {
    result.push(
      <pre key={key++} style={{
        background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-sm)', padding: '12px 14px',
        fontFamily: 'var(--font-mono)', fontSize: '12px',
        lineHeight: '1.6', overflowX: 'auto', margin: '10px 0',
        color: 'var(--gray-800)',
      }}>
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
    codeBuffer = [];
    codeLang = '';
  };

  const parseInline = (line) => {
    // bold
    line = line.replace(/\*\*(.+?)\*\*/g, (_, m) =>
      `<strong style="font-weight:600">${m}</strong>`);
    // inline code — highlight variable-like {{...}} in sakura
    line = line.replace(/`(.+?)`/g, (_, m) =>
      `<code style="font-family:var(--font-mono);font-size:0.88em;background:var(--gray-100);padding:1px 5px;border-radius:3px;border:1px solid var(--gray-200)">${m}</code>`);
    // variables {{...}}
    line = line.replace(/\{\{(.+?)\}\}/g, (_, m) =>
      `<span style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,183,197,0.18);border:1px solid rgba(255,183,197,0.5);border-radius:4px;padding:1px 6px;font-family:var(--font-mono);font-size:0.82em;color:#C45E78;font-weight:500">{{${m}}}</span>`);
    return line;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) { codeBuffer.push(line); continue; }

    if (line.startsWith('# ')) {
      result.push(<h1 key={key++} style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '12px', marginTop: key > 1 ? '20px' : '0', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(2)) }} />);
    } else if (line.startsWith('## ')) {
      result.push(<h2 key={key++} style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.01em', margin: '20px 0 8px', color: 'var(--black)' }} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(3)) }} />);
    } else if (line.startsWith('### ')) {
      result.push(<h3 key={key++} style={{ fontSize: '13.5px', fontWeight: '600', margin: '14px 0 6px', color: 'var(--gray-800)' }} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(4)) }} />);
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const checked = line.startsWith('- [x] ');
      result.push(
        <div key={key++} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0', fontSize: '13.5px', lineHeight: '1.55' }}>
          <div style={{
            width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: '3px',
            border: `1.5px solid ${checked ? sakuraPink : 'var(--gray-300)'}`,
            background: checked ? 'rgba(255,183,197,0.2)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {checked && <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: sakuraPink }} />}
          </div>
          <span dangerouslySetInnerHTML={{ __html: parseInline(line.slice(6)) }} />
        </div>
      );
    } else if (line.startsWith('- ')) {
      result.push(
        <div key={key++} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', margin: '4px 0', fontSize: '13.5px', lineHeight: '1.55' }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: sakuraPink, flexShrink: 0, marginTop: '7px'
          }} />
          <span dangerouslySetInnerHTML={{ __html: parseInline(line.slice(2)) }} />
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      result.push(
        <div key={key++} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', margin: '4px 0', fontSize: '13.5px', lineHeight: '1.55' }}>
          <span style={{ fontWeight: '600', color: sakuraPink, fontFamily: 'var(--font-mono)', fontSize: '11px', minWidth: '16px', marginTop: '2px' }}>{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: parseInline(line.replace(/^\d+\. /, '')) }} />
        </div>
      );
    } else if (line.startsWith('> ')) {
      result.push(
        <div key={key++} style={{
          borderLeft: `3px solid ${sakuraPink}`, paddingLeft: '12px',
          margin: '10px 0', fontStyle: 'italic', fontSize: '13px',
          color: 'var(--gray-600)', lineHeight: '1.55'
        }} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(2)) }} />
      );
    } else if (line.trim() === '') {
      result.push(<div key={key++} style={{ height: '6px' }} />);
    } else {
      result.push(
        <p key={key++} style={{ fontSize: '13.5px', lineHeight: '1.65', margin: '3px 0', color: 'var(--gray-800)' }}
          dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
      );
    }
  }

  if (inCodeBlock && codeBuffer.length) flushCode();
  return result;
};

// ─── Skills Dropdown ──────────────────────────────────────────────────────────

const SkillsDropdown = ({ skills, onSelect, onClose }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '36px', right: '0',
      width: '240px', background: 'var(--white)',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius)', padding: '6px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      zIndex: 100,
    }}>
      <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', padding: '4px 8px 6px' }}>
        Add Skill
      </div>
      {skills.map(skill => (
        <button key={skill.id}
          onClick={() => { onSelect(skill); onClose(); }}
          style={{
            display: 'flex', flexDirection: 'column', gap: '1px',
            width: '100%', padding: '7px 9px', borderRadius: 'var(--radius-sm)',
            textAlign: 'left', cursor: 'pointer', border: 'none',
            background: 'none', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <span style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--black)' }}>
            ✦ {skill.name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
            {skill.description}
          </span>
        </button>
      ))}
    </div>
  );
};

// ─── Prompt Viewer ────────────────────────────────────────────────────────────

const PromptViewer = ({ prompt, onOpenDrawer, onCopy, sakuraPink }) => {
  const [view, setView] = React.useState('render'); // 'render' | 'raw'
  const [showSkills, setShowSkills] = React.useState(false);
  const [addedSkills, setAddedSkills] = React.useState([]);
  const [copyFeedback, setCopyFeedback] = React.useState(false);

  React.useEffect(() => {
    setView('render');
    setAddedSkills([]);
    setShowSkills(false);
  }, [prompt?.id]);

  if (!prompt) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '12px', color: 'var(--gray-300)',
      }}>
        <div style={{ fontSize: '48px', opacity: 0.4 }}>🌸</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-400)' }}>
          Select a prompt to get started
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gray-300)' }}>
          Choose a card from the left panel
        </div>
      </div>
    );
  }

  const handleAddSkill = (skill) => {
    setAddedSkills(prev => [...prev, skill]);
  };

  const fullContent = prompt.content +
    (addedSkills.length > 0
      ? '\n\n---\n' + addedSkills.map(s => `Usa la skill **${s.name}** para este desarrollo.`).join('\n')
      : '');

  const handleCopy = () => {
    const plainText = fullContent.replace(/\*\*/g, '').replace(/\{\{(.+?)\}\}/g, '{{$1}}');
    navigator.clipboard.writeText(plainText).catch(() => {});
    setCopyFeedback(true);
    onCopy();
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--white)',
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: '10px',
        flexShrink: 0,
      }}>
        {/* Title + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em', whiteSpace: 'nowrap', lineHeight: 1 }}>
              {prompt.title}
            </h2>
            {prompt.hasVariables && (
              <span style={{ fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>🌸</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
            {prompt.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '10px', fontWeight: '500',
                color: '#C45E78', background: 'rgba(255,183,197,0.18)',
                border: '1px solid rgba(255,183,197,0.4)',
                borderRadius: '4px', padding: '1px 6px',
                fontFamily: 'var(--font-mono)',
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', background: 'var(--gray-100)',
          borderRadius: 'var(--radius-sm)', padding: '3px',
          border: '1px solid var(--gray-200)',
        }}>
          {['render', 'raw'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '4px 12px', borderRadius: '4px', fontSize: '11.5px',
              fontWeight: '500', border: 'none', cursor: 'pointer',
              transition: 'all 0.15s',
              background: view === v ? 'var(--white)' : 'none',
              color: view === v ? 'var(--black)' : 'var(--gray-400)',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontFamily: view === v && v === 'raw' ? 'var(--font-mono)' : 'var(--font-ui)',
            }}>
              {v === 'render' ? 'Render' : 'Raw'}
            </button>
          ))}
        </div>

        {/* Skills button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSkills(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 11px', borderRadius: 'var(--radius-sm)',
              fontSize: '12px', fontWeight: '500',
              border: '1px solid var(--gray-200)',
              background: showSkills ? 'var(--gray-50)' : 'none',
              color: 'var(--gray-600)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sakura)'; e.currentTarget.style.color = 'var(--black)'; }}
            onMouseLeave={e => { if (!showSkills) { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.color = 'var(--gray-600)'; } }}
          >
            <span style={{ fontSize: '11px' }}>✦</span>
            Add Skill
            {addedSkills.length > 0 && (
              <span style={{
                background: 'var(--sakura)', color: 'var(--white)',
                borderRadius: '8px', padding: '0 5px', fontSize: '10px', fontWeight: '600'
              }}>{addedSkills.length}</span>
            )}
          </button>
          {showSkills && (
            <SkillsDropdown
              skills={SKILLS_DATA}
              onSelect={handleAddSkill}
              onClose={() => setShowSkills(false)}
            />
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 14px', borderRadius: 'var(--radius-sm)',
            fontSize: '12px', fontWeight: '500',
            background: copyFeedback ? 'rgba(255,183,197,0.2)' : 'var(--black)',
            color: copyFeedback ? '#C45E78' : 'var(--white)',
            border: copyFeedback ? '1px solid var(--sakura)' : '1px solid var(--black)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {copyFeedback ? '✓ Copied' : 'Copy'}
        </button>

        {/* Use template */}
        {prompt.hasVariables && (
          <button
            onClick={onOpenDrawer}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              fontSize: '12px', fontWeight: '500',
              background: 'none',
              color: '#C45E78',
              border: '1px solid rgba(255,183,197,0.6)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,183,197,0.12)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,183,197,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            🌸 Use Template
          </button>
        )}
      </div>

      {/* Added skills chips */}
      {addedSkills.length > 0 && (
        <div style={{
          padding: '8px 24px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: '500' }}>Skills activas:</span>
          {addedSkills.map((skill, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'rgba(255,183,197,0.15)', border: '1px solid rgba(255,183,197,0.4)',
              borderRadius: '5px', padding: '2px 8px',
              fontSize: '11px', fontWeight: '500', color: '#C45E78',
            }}>
              ✦ {skill.name}
              <button onClick={() => setAddedSkills(prev => prev.filter((_, j) => j !== i))}
                style={{ border: 'none', background: 'none', color: '#C45E78', cursor: 'pointer', fontSize: '11px', padding: '0', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {view === 'render' ? (
          <div style={{ maxWidth: '680px' }}>
            {renderMarkdown(fullContent, sakuraPink)}
          </div>
        ) : (
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: '12.5px',
            lineHeight: '1.7', color: 'var(--gray-800)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)', padding: '20px 22px',
          }}>
            {fullContent}
          </pre>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { PromptViewer });
