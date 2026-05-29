import { TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function normalizeErrorOutput(text) {
  const value = String(text || '').trim();
  if (!value) return '';

  if (/^request failed with status code/i.test(value)) {
    return 'The code did not compile or run successfully. Check the editor for the exact error line, or review the backend response payload.';
  }

  return value;
}

function OutputPanel({ editorRef, code, input, setInput, output, result, effectiveLocked, isSubmitting, currentProblem, onRunCode }) {
  const normalizedProblemType = String(currentProblem?.problemType || '').trim().toLowerCase();
  const isDesignProblem = normalizedProblemType === 'design' || normalizedProblemType === 'designproblem';
  const displayOutput = normalizeErrorOutput(output);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLog, setTerminalLog] = useState('');
  const terminalRef = useRef(null);
  const terminalLogRef = useRef(null);
  const waitingForInputRef = useRef(false);
  const inputGroupsRef = useRef([]);
  const sessionPrefixRef = useRef('');
  const sessionInputLinesRef = useRef([]);
  const decorationIdsRef = useRef([]);

  function decodeStringLiteral(text) {
    return String(text || '')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"');
  }

  function extractLastPromptText(segment) {
    const statements = [];
    const patterns = [
      {
        regex: /cout\s*(?:<<\s*(?:"([^"]*)"|endl|[^;]+))*\s*;/gi,
        text: (statement) => Array.from(statement.matchAll(/"([^"]*)"/g)).map((match) => decodeStringLiteral(match[1])).join('')
      },
      {
        regex: /printf\s*\(\s*"([^"]*)"[^;]*;/gi,
        text: (statement, match) => decodeStringLiteral(match[1]).replace(/%[-+#0-9.]*[a-zA-Z]/g, '')
      },
      {
        regex: /puts\s*\(\s*"([^"]*)"\s*\)\s*;/gi,
        text: (statement, match) => decodeStringLiteral(match[1])
      },
      {
        regex: /System\.out\.print(?:ln)?\s*\(\s*"([^"]*)"\s*\)\s*;/gi,
        text: (statement, match) => decodeStringLiteral(match[1])
      },
      {
        regex: /print\s*\(\s*["']([^"']*)["']\s*\)/gi,
        text: (statement, match) => decodeStringLiteral(match[1])
      }
    ];

    for (const { regex, text } of patterns) {
      let match = regex.exec(segment);
      while (match) {
        statements.push({ index: match.index, text: text(match[0], match) });
        match = regex.exec(segment);
      }
    }

    statements.sort((a, b) => a.index - b.index);
    return statements[statements.length - 1]?.text || '';
  }

  function parseInputGroups(sourceCode) {
    const source = String(sourceCode || '');
    const groups = [];
    const patterns = [
      {
        regex: /cin\s*((?:>>\s*[A-Za-z_$][\w$]*(?:\s*)?)+)\s*;/gi,
        count: (matchText) => (matchText.match(/>>/g) || []).length
      },
      {
        regex: /scanf\s*\(\s*"([^"]*)"[^;]*;/gi,
        count: (matchText) => {
          const format = matchText.match(/scanf\s*\(\s*"([^"]*)"/i)?.[1] || '';
          return (format.match(/%(?!%)[0-9.*-]*[a-zA-Z]/g) || []).length;
        }
      },
      {
        regex: /\.\s*next(?:Int|Long|Double|Float|Line)?\s*\(/gi,
        count: () => 1
      },
      {
        regex: /\binput\s*\(/gi,
        count: () => 1
      }
    ];

    for (const { regex, count } of patterns) {
      let match = regex.exec(source);
      while (match) {
        groups.push({ index: match.index, count: Math.max(1, count(match[0])), prompt: '' });
        match = regex.exec(source);
      }
    }

    groups.sort((a, b) => a.index - b.index);
    let previousIndex = 0;
    return groups.map((group) => {
      const segment = source.slice(previousIndex, group.index);
      previousIndex = group.index;
      const prompt = extractLastPromptText(segment).split('\n').pop() || '';
      return { ...group, prompt: prompt.trimEnd() };
    });
  }

  function extractPromptText(sourceCode) {
    const source = String(sourceCode || '');
    const patterns = [
      /cout\s*<<\s*"([^"]+)"/i,
      /printf\s*\(\s*"([^"]+)"/i,
      /puts\s*\(\s*"([^"]+)"/i
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match?.[1]) {
        return decodeStringLiteral(match[1]).trim();
      }
    }

    return '';
  }

  function getInputTokens(lines) {
    return lines
      .join('\n')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function getCompletedInputGroupCount(inputGroups, providedInputCount) {
    let consumed = 0;
    let completed = 0;

    for (const group of inputGroups) {
      consumed += group.count;
      if (providedInputCount < consumed) break;
      completed += 1;
    }

    return completed;
  }

  function trimOutputAtPendingPrompt(rawOutput, inputGroups, providedInputCount, requiredInputCount) {
    const outputText = String(rawOutput || '').replace(/\r/g, '');
    if (providedInputCount >= requiredInputCount) {
      return outputText.trimEnd();
    }

    const nextPrompt = inputGroups[getCompletedInputGroupCount(inputGroups, providedInputCount)]?.prompt || '';
    if (!nextPrompt) {
      return outputText.trimEnd();
    }

    const promptIndex = outputText.toLowerCase().indexOf(nextPrompt.toLowerCase());
    if (promptIndex === -1) {
      return outputText.trimEnd();
    }

    return outputText.slice(0, promptIndex + nextPrompt.length).trimEnd();
  }

  function mergeTerminalEcho(rawOutput, stdinLines, inputGroups) {
    const lines = stdinLines.filter((line) => line.length > 0);
    let remaining = String(rawOutput || '').replace(/\r/g, '');
    let transcript = '';
    let tokenCountBeforeLine = 0;
    const groupBounds = inputGroups.reduce((items, group) => {
      const previousEnd = items.length ? items[items.length - 1].end : 0;
      return [...items, { start: previousEnd, end: previousEnd + group.count, prompt: group.prompt }];
    }, []);

    for (const line of lines) {
      const groupForLine = groupBounds.find((group) => tokenCountBeforeLine >= group.start && tokenCountBeforeLine < group.end);
      const prompt = groupForLine && tokenCountBeforeLine === groupForLine.start ? groupForLine.prompt : '';
      tokenCountBeforeLine += getInputTokens([line]).length;

      if (!prompt) {
        transcript += `${line}\n`;
        continue;
      }

      const promptIndex = remaining.toLowerCase().indexOf(prompt.toLowerCase());
      if (promptIndex === -1) {
        transcript += `${prompt} ${line}\n`;
        continue;
      }

      const promptEnd = promptIndex + prompt.length;
      transcript += remaining.slice(0, promptEnd).trimEnd();
      transcript += ` ${line}\n`;
      remaining = remaining.slice(promptEnd).replace(/^[ \t]*/, '');
    }

    return `${transcript}${remaining}`.trimEnd();
  }

  function buildPartialTranscript(stdinLines, inputGroups) {
    const firstPrompt = inputGroups[0]?.prompt || extractPromptText(code) || '';
    return `${firstPrompt}${stdinLines.length ? ` ${stdinLines.join('\n')}` : ''}`.trimEnd();
  }

  function parseLineNumberFromText(text) {
    if (!text) return null;
    // common patterns: at <file>:<line>:<col>, <file>:<line>:<col>, line <line>
    const patterns = [/at .*:(\d+):\d+/, /:(\d+):\d+/, /line (\d+)/i, /on line (\d+)/i];
    for (const p of patterns) {
      const m = String(text).match(p);
      if (m && m[1]) return Number(m[1]);
    }
    return null;
  }

  function goToEditorLine(line) {
    const editor = editorRef?.current;
    if (!editor || !line) return;
    try {
      if (typeof editor.revealLineInCenter === 'function') {
        editor.revealLineInCenter(line);
      }
      if (typeof editor.setPosition === 'function') {
        editor.setPosition({ lineNumber: line, column: 1 });
      }

      const newDecorations = [
        {
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: { isWholeLine: true, className: 'my-error-line' }
        }
      ];

      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current || [], newDecorations);

      // remove highlight after a short delay
      setTimeout(() => {
        try {
          if (editor && decorationIdsRef.current && decorationIdsRef.current.length) {
            decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
          }
        } catch (e) {
          // ignore
        }
      }, 4000);
    } catch (e) {
      console.warn('Failed to navigate to editor line', e);
    }
  }

  useEffect(() => {
    if (!isDesignProblem) {
      return;
    }

    setTerminalInput('');
    waitingForInputRef.current = false;
    inputGroupsRef.current = [];
    sessionPrefixRef.current = '';
    sessionInputLinesRef.current = [];
    const intro = [
      '> Design Terminal ready.',
      '> Compile with g++ or gcc, then run ./a.out.',
      '> Type input after the prompt line and press Enter.'
    ].join('\n');
    setTerminalLog((prev) => prev || intro);
  }, [currentProblem?._id, currentProblem?.id, isDesignProblem]);

  useEffect(() => {
    if (!isDesignProblem || !terminalLogRef.current) return;
    terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
  }, [terminalLog, isDesignProblem]);

  const submitTerminalInput = async () => {
    if (effectiveLocked || isSubmitting) return;
    const command = String(terminalInput || '').trim();
    if (!command) return;

    const appendLine = (line) => {
      setTerminalLog((prev) => `${prev ? `${prev}\n` : ''}${line}`);
    };

    if (command.toLowerCase() === 'clear') {
      setTerminalLog('');
      setInput?.('');
      waitingForInputRef.current = false;
      inputGroupsRef.current = [];
      sessionPrefixRef.current = '';
      sessionInputLinesRef.current = [];
      setTerminalInput('');
      return;
    }

    if (command.toLowerCase().startsWith('g++') || command.toLowerCase().startsWith('gcc')) {
      setTerminalLog((prev) => `${prev ? `${prev}\n` : ''}$ ${command}`);
      setTerminalInput('');
      return;
    }

    if (command.toLowerCase().startsWith('./a.out')) {
      const inputGroups = parseInputGroups(code);
      const requiredInputCount = inputGroups.reduce((total, group) => total + group.count, 0);
      const promptText = inputGroups[0]?.prompt || extractPromptText(code) || '';
      const prefix = `${terminalLog ? `${terminalLog}\n` : ''}$ ${command}\n`;
      inputGroupsRef.current = inputGroups;
      sessionPrefixRef.current = prefix;
      sessionInputLinesRef.current = [];
      waitingForInputRef.current = requiredInputCount > 0;
      setTerminalLog(`${prefix}${requiredInputCount > 0 ? promptText : 'Running...'}`.trimEnd());
      setTerminalInput('');
      if (requiredInputCount === 0) {
        const response = await onRunCode?.('');
        const runOutput = response?.output || response?.error || response?.stderr || response?.compile_output || '';
        setTerminalLog(`${prefix}${String(runOutput || '').replace(/\r/g, '').trimEnd()}`.trimEnd());
      }
      return;
    }

    const inputGroups = inputGroupsRef.current;
    const nextLines = [...sessionInputLinesRef.current, command];
    const requiredInputCount = inputGroups.reduce((total, group) => total + group.count, 0);
    const providedInputCount = getInputTokens(nextLines).length;
    const nextInput = nextLines.join('\n');
    sessionInputLinesRef.current = nextLines;
    setInput?.(nextInput);

    if (waitingForInputRef.current) {
      const firstGroupCount = inputGroups[0]?.count || 0;
      if (requiredInputCount > 0 && providedInputCount < firstGroupCount) {
        setTerminalLog(`${sessionPrefixRef.current}${buildPartialTranscript(nextLines, inputGroups)}`.trimEnd());
        setTerminalInput('');
        return;
      }

      const response = await onRunCode?.(nextInput);
      const runOutput = response?.output || response?.error || response?.stderr || response?.compile_output || '';
      const visibleOutput = trimOutputAtPendingPrompt(runOutput, inputGroups, providedInputCount, requiredInputCount);
      const transcript = mergeTerminalEcho(visibleOutput, nextLines, inputGroups);
      setTerminalLog(`${sessionPrefixRef.current}${transcript}`.trimEnd());
      waitingForInputRef.current = providedInputCount < requiredInputCount;
    } else {
      appendLine(command);
    }
    setTerminalInput('');
  };

  useEffect(() => {
    if (!output) return;
    const lines = String(output).split('\n');
    for (const line of lines) {
      const ln = parseLineNumberFromText(line);
      if (ln) {
        goToEditorLine(ln);
        break;
      }
    }
  }, [output]);

  return (
    <div className="overflow-y-auto bg-[#0a0a0a]" style={{ width: '20%', minWidth: '240px' }}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/50">
          <TerminalSquare size={13} /> {isDesignProblem ? 'Terminal' : 'Output'}
        </div>
        {isDesignProblem ? (
          <div className="flex flex-1 flex-col rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-300">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">Terminal session</div>
            <div ref={terminalLogRef} className={`${String(displayOutput).includes('Error') ? 'text-red-400' : 'text-gray-300'} flex-1 whitespace-pre-wrap overflow-auto`}>
              <pre className="whitespace-pre-wrap">{terminalLog || '> Ready. Type run and press Enter.'}</pre>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
              <span className="text-emerald-300">$</span>
              <input
                ref={terminalRef}
                value={terminalInput}
                onChange={(event) => setTerminalInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitTerminalInput();
                  }
                }}
                disabled={effectiveLocked || isSubmitting}
                placeholder="Type g++ | ./a.out | input text"
                className="flex-1 border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35 disabled:opacity-50"
              />
            </div>
            {result?.isDesignProblem ? <p className="mt-2 text-green-300 font-semibold">Code submitted successfully.</p> : null}
          </div>
        ) : (
          <textarea
            placeholder="Enter custom input"
            value={input}
            onChange={(event) => setInput?.(event.target.value)}
            disabled={effectiveLocked || isSubmitting}
            className="mb-3 min-h-28 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-200 outline-none placeholder:text-white/35 disabled:opacity-50"
          />
        )}
        {!isDesignProblem && (
          <div className={`flex-1 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs ${
              String(displayOutput).includes('Error') ? 'text-red-400' : 'text-gray-300'
            }`}>
            {displayOutput ? (
              displayOutput.split('\n').map((line, idx) => {
                const lineNumber = parseLineNumberFromText(line);
                if (lineNumber) {
                  return (
                    <div key={idx} className="cursor-pointer hover:underline" onClick={() => goToEditorLine(lineNumber)}>
                      <span className="text-red-300">{line}</span>
                    </div>
                  );
                }

                return (
                  <div key={idx}>
                    {line}
                  </div>
                );
              })
            ) : (
              <pre className="whitespace-pre-wrap">&gt; Ready for execution</pre>
            )}
          </div>
        )}
        {result && !isDesignProblem ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">
              <div className="font-semibold">Public Test Results</div>
              <div className="mt-1">
                Public {result.passedPublic || 0}/{result.totalPublic || 0}
                {Number(result.totalHidden || 0) > 0 ? ` · Hidden ${result.passedHidden || 0}/${result.totalHidden || 0}` : ''}
              </div>
            </div>
            {Array.isArray(result.details) && result.details.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.details.map((detail, index) => (
                  <div 
                    key={`${detail.input || ''}-${index}`} 
                    className={`rounded-lg border p-2 text-xs ${
                      detail.passed 
                        ? 'border-emerald-500/30 bg-emerald-500/10' 
                        : 'border-red-500/30 bg-red-500/10'
                    }`}
                  >
                    <div className={`font-semibold ${detail.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                      Test {index + 1} {(detail.isPublic ?? detail.visibility === 'public') ? '(Public)' : '(Hidden)'}: {detail.passed ? '✓ Pass' : '✗ Fail'}
                    </div>
                    {detail.input && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Input:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.input}</pre>
                      </div>
                    )}
                    {detail.expectedOutput && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Expected:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.expectedOutput}</pre>
                      </div>
                    )}
                    {!detail.passed && detail.actualOutput && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Your Output:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.actualOutput}</pre>
                      </div>
                    )}
                    {!detail.passed && detail.error && (
                      <div className="mt-1 text-red-400">
                        <div className="text-red-300">Error:</div>
                        <pre className="text-red-400 whitespace-pre-wrap wrap-break-word">{detail.error}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OutputPanel;
