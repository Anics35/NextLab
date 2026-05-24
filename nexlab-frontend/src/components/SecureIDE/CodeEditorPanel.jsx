import Editor from '@monaco-editor/react';

function CodeEditorPanel({ currentProblemId, language, code, editorRef, latestCodeRef, syncTimeoutRef, setCode, isLocked }) {
  return (
    <div className="flex-1">
      <Editor
        key={`${currentProblemId || 'problem'}-${language}`}
        height="100%"
        theme="vs-dark"
        language={language}
        defaultValue={code}
        onMount={(editor) => {
          editorRef.current = editor;
          if (latestCodeRef) {
            latestCodeRef.current = editor.getValue();
          }
        }}
        onChange={(value) => {
          if (latestCodeRef) {
            latestCodeRef.current = value || '';
          }
          if (typeof setCode === 'function') {
            setCode(value || '');
          }
          if (syncTimeoutRef) {
            if (syncTimeoutRef.current) {
              window.clearTimeout(syncTimeoutRef.current);
            }
            syncTimeoutRef.current = window.setTimeout(() => {
              syncTimeoutRef.current = null;
            }, 300);
          }
        }}
        options={{
          readOnly: isLocked,
          fontSize: 14,
          minimap: { enabled: false },
          padding: { top: 16 },
          automaticLayout: true,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on'
        }}
      />
    </div>
  );
}

export default CodeEditorPanel;
