'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatChart from '@/components/ChatChart';
import {
  Sparkles, Send, RotateCcw, Zap, BarChart3,
  CheckCircle2, Plus, User,
  AlertCircle, Copy, Check,
} from 'lucide-react';


function parseCharts(text) {
  const charts = [];
  if (!text) return { cleaned: '', charts: [] };

  const cleaned = text.replace(/```chart\n([\s\S]*?)```/g, (_, json) => {
    try {
      charts.push(JSON.parse(json));
    } catch (e) {
      console.error("Chart parsing failed", e);
    }
    return '';
  });
  return { cleaned: cleaned.trim(), charts };
}

function sanitizeAIText(text) {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';
  const text = msg.parts?.[0]?.text ?? '';


  const { cleaned, charts } = !isUser ? parseCharts(sanitizeAIText(text)) : { cleaned: text, charts: [] };
  const hasCharts = charts.length > 0;

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      { }
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5 ${isUser ? 'bg-slate-900' : 'bg-gradient-to-br from-violet-500 to-indigo-600'
        }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Sparkles className="w-3.5 h-3.5 text-white" />}
      </div>

      { }
      <div className={`relative flex flex-col gap-1 
        ${hasCharts ? 'w-full' : isUser ? 'max-w-[60%] items-end' : 'max-w-[80%] items-start'}
      `}>
        <div className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed w-full ${isUser
          ? 'bg-slate-900 text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
          }`}>

          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-sm font-black text-slate-900 mb-2 mt-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-black text-slate-900 mb-1.5 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[13px] font-bold text-slate-800 mb-1 mt-2 first:mt-0">{children}</h3>,
                  p: ({ children }) => <p className="text-[13.5px] text-slate-700 mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-1 mb-2 ml-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 ml-1">{children}</ol>,
                  li: ({ children }) => (
                    <li className="flex gap-2 text-[13px] text-slate-700 leading-snug">
                      <span className="text-indigo-500 mt-1.5 flex-shrink-0 text-[8px]">●</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-slate-500">{children}</em>,
                  hr: () => <hr className="border-slate-200 my-3" />,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-indigo-400 pl-3 my-2 text-slate-500 italic text-[13px]">
                      {children}
                    </blockquote>
                  ),
                  code: ({ inline, children }) =>
                    inline
                      ? <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>
                      : <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto my-2 text-[12px] font-mono text-slate-700">{children}</pre>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200">
                      <table className="w-full text-[12px]">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
                  tr: ({ children }) => <tr className="hover:bg-slate-50 transition-colors">{children}</tr>,
                  th: ({ children }) => <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wide text-[10px]">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,
                }}
              >
                {cleaned}
              </ReactMarkdown>

              { }
              {charts.length === 1 && (
                <div className="mt-4">
                  <ChatChart chart={charts[0]} />
                </div>
              )}

              {charts.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {charts.map((chart, i) => (
                    <ChatChart key={i} chart={chart} />
                  ))}
                </div>
              )}
            </>
          )}

          {msg.actionPerformed && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] text-emerald-500 font-semibold uppercase tracking-tight">Action completed</span>
            </div>
          )}
        </div>

        { }
        {!isUser && (
          <button onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 self-start">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}



function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="px-4 py-3.5 bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
          ))}
        </div>
      </div>
    </div>
  );
}



const QUICK_PROMPTS = [
  { icon: BarChart3, label: 'How am I doing this week?', text: 'Give me a summary of how I\'m doing this week — completion rate, key wins, and areas to improve.' },
  { icon: Zap, label: 'What should I do next?', text: 'Look at my pending tasks and tell me what I should work on right now based on priority and deadlines.' },
  { icon: Plus, label: 'Add a task for me', text: 'I want to add a new task. Help me create one.' },
  { icon: CheckCircle2, label: 'Review my pending tasks', text: 'Show me all my pending tasks and help me decide which to prioritize or defer.' },
];



function EmptyState({ onPrompt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-[20px] font-bold text-slate-900 mb-2">Stepwise AI</h2>
      <p className="text-[13px] text-slate-500 text-center max-w-xs mb-8 leading-relaxed">
        Your personal planning assistant. Ask me to manage tasks, run reports, or talk through your week.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {QUICK_PROMPTS.map(({ icon: Icon, label, text }) => (
          <button key={label} onClick={() => onPrompt(text)}
            className="flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-sm text-left transition-all group">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-slate-300 transition-colors">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}



const STORAGE_KEY = 'stepwise-ai-history';

export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);


  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/chat/history', { credentials: 'include' });
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
    loadHistory();
  }, []);



  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;
    setInput('');
    setError('');

    if (inputRef.current) {
      inputRef.current.style.height = '48px';
    }

    const userMsg = { role: 'user', parts: [{ text: trimmed }] };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((_, i) => i !== 0 || messages[0].role !== 'model')
        .map(m => ({ role: m.role, parts: m.parts }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: data.text }],
        actionPerformed: data.actionPerformed,
      }]);

      if (data.actionPerformed) {
        window.dispatchEvent(new CustomEvent('refresh-data'));
      }
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Sorry, I ran into an issue: ${e.message}` }],
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, loading]);

  async function clearChat() {
    const confirmed = window.confirm('Start a new chat? This will clear your current conversation.');
    if (!confirmed) return;

    try {
      await fetch('/api/chat/history', { method: 'DELETE', credentials: 'include' });
      setMessages([]);
      setError('');
    } catch (e) {
      setError('Failed to clear chat. Try again.');
    }
  }


  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      { }
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Sparkles className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 leading-tight">Stepwise AI</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {loading ? 'Thinking…' : messages.length === 0 ? 'Ask me anything' : `${messages.length} messages`}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> New chat
          </button>
        )}
      </div>

      { }
      <div className="flex-1 px-4 sm:px-8">
        {messages.length === 0 ? (
          <EmptyState onPrompt={sendMessage} />
        ) : (
          <div className="max-w-[1100px] mx-auto py-8 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
          </div>
        )}
      </div>

      { }
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-[1100px] mx-auto">
          {error && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="relative flex items-end gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder="Message Stepwise AI…"
              className="flex-1 resize-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all leading-relaxed overflow-y-auto"
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2.5">
            Stepwise AI can create, update, and delete tasks · Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}