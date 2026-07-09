import React from 'react';

export default function CodeEditor({ value, onChange, language, onBlockedAction }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const newValue = value.substring(0, selectionStart) + '    ' + value.substring(selectionEnd);
      onChange(newValue);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 4;
      });
    }
  };

  const block = (e) => {
    e.preventDefault();
    onBlockedAction?.();
  };

  return (
    <div className="code-editor-wrapper">
      <div className="code-editor-topbar">
        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
        <span className="code-editor-lang">{language === 'python' ? 'solution.py' : 'solution.cpp'}</span>
      </div>
      <textarea
        className="code-editor"
        spellCheck="false"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCopy={block}
        onCut={block}
        onPaste={block}
        onContextMenu={block}
      />
    </div>
  );
}
