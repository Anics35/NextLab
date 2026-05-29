import { TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const patterns = [/cout\s*<<\s*"([^"]+)"/i, /printf\s*\(\s*"([^"]+)"/i, /puts\s*\(\s*"([^"]+)"/i];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return decodeStringLiteral(match[1]).trim();
  }

  return '';
}

function getInputTokens(lines) {
  return lines.join('\n').trim().split(/\s+/).filter(Boolean);
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
  if (providedInputCount >= requiredInputCount) return outputText.trimEnd();

  const nextPrompt = inputGroups[getCompletedInputGroupCount(inputGroups, providedInputCount)]?.prompt || '';
  if (!nextPrompt) return outputText.trimEnd();

  const promptIndex = outputText.toLowerCase().indexOf(nextPrompt.toLowerCase());
  if (promptIndex === -1) return outputText.trimEnd();

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

function buildPartialTranscript(stdinLines, inputGroups, code) {
  const firstPrompt = inputGroups[0]?.prompt || extractPromptText(code) || '';
  return `${firstPrompt}${stdinLines.length ? ` ${stdinLines.join('\n')}` : ''}`.trimEnd();
}

function DesignTerminal({ code, onRunCode, disabled = false, onInputChange, className = '' }) {
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLog, setTerminalLog] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const terminalLogRef = useRef(null);
  const waitingForInputRef = useRef(false);
  const inputGroupsRef = useRef([]);
  const sessionPrefixRef = useRef('');
  const sessionInputLinesRef = useRef([]);

  useEffect(() => {
    waitingForInputRef.current = false;
    inputGroupsRef.current = [];
    sessionPrefixRef.current = '';
    sessionInputLinesRef.current = [];
    setTerminalInput('');
    setTerminalLog([
      '> Design Terminal ready.',
      '> Compile with g++ or gcc, then run ./a.out.',
      '> Type input after the prompt line and press Enter.'
    ].join('\n'));
  }, [code]);

  useEffect(() => {
    if (!terminalLogRef.current) return;
    terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
  }, [terminalLog]);

  const runProgram = async (stdin, inputGroups, providedInputCount, requiredInputCount) => {
    setIsRunning(true);
    try {
      const response = await onRunCode?.(stdin);
      const runOutput = response?.output || response?.error || response?.stderr || response?.compile_output || '';
      const visibleOutput = trimOutputAtPendingPrompt(runOutput, inputGroups, providedInputCount, requiredInputCount);
      const transcript = mergeTerminalEcho(visibleOutput, sessionInputLinesRef.current, inputGroups);
      setTerminalLog(`${sessionPrefixRef.current}${transcript}`.trimEnd());
      waitingForInputRef.current = providedInputCount < requiredInputCount;
    } finally {
      setIsRunning(false);
    }
  };

  const submitTerminalInput = async () => {
    if (disabled || isRunning) return;
    const command = String(terminalInput || '').trim();
    if (!command) return;

    if (command.toLowerCase() === 'clear') {
      waitingForInputRef.current = false;
      inputGroupsRef.current = [];
      sessionPrefixRef.current = '';
      sessionInputLinesRef.current = [];
      onInputChange?.('');
      setTerminalLog('');
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
        await runProgram('', inputGroups, 0, 0);
      }
      return;
    }

    const inputGroups = inputGroupsRef.current;
    const nextLines = [...sessionInputLinesRef.current, command];
    const requiredInputCount = inputGroups.reduce((total, group) => total + group.count, 0);
    const providedInputCount = getInputTokens(nextLines).length;
    const nextInput = nextLines.join('\n');
    sessionInputLinesRef.current = nextLines;
    onInputChange?.(nextInput);

    if (waitingForInputRef.current) {
      const firstGroupCount = inputGroups[0]?.count || 0;
      if (requiredInputCount > 0 && providedInputCount < firstGroupCount) {
        setTerminalLog(`${sessionPrefixRef.current}${buildPartialTranscript(nextLines, inputGroups, code)}`.trimEnd());
        setTerminalInput('');
        return;
      }

      setTerminalInput('');
      await runProgram(nextInput, inputGroups, providedInputCount, requiredInputCount);
      return;
    }

    setTerminalLog((prev) => `${prev ? `${prev}\n` : ''}${command}`);
    setTerminalInput('');
  };

  return (
    <div className={`flex min-h-0 flex-col rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-300 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
        <TerminalSquare size={13} /> Terminal session
      </div>
      <div ref={terminalLogRef} className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-gray-300">
        <pre className="whitespace-pre-wrap">{terminalLog || '> Ready. Type run and press Enter.'}</pre>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
        <span className="text-emerald-300">$</span>
        <input
          value={terminalInput}
          onChange={(event) => setTerminalInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submitTerminalInput();
            }
          }}
          disabled={disabled || isRunning}
          placeholder={isRunning ? 'Running...' : 'Type g++ | ./a.out | input text'}
          className="flex-1 border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export default DesignTerminal;
