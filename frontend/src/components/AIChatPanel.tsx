import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, Wrench } from 'lucide-react';
import { api } from '../api';
import {
  type AIProvider,
  type ChatMessage,
  type Trip,
  type GeminiModel,
  GEMINI_MODELS,
  GEMINI_MODEL_LABELS,
  DEFAULT_GEMINI_MODEL,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { friendlyAIError } from '../utils/aiErrors';

export function AIChatPanel({
  trip,
  onTripUpdated,
  onOpenSettings,
}: {
  trip: Trip;
  onTripUpdated: (t: Trip) => void;
  onOpenSettings: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(
    DEFAULT_GEMINI_MODEL
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasKey = (p: AIProvider) => Boolean(user?.apiKeys?.[p]);

  useEffect(() => {
    if (!hasKey('openai') && hasKey('gemini')) setProvider('gemini');
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async () => {
    if (!input.trim() || busy) return;
    if (!hasKey(provider)) {
      setError(`Add a ${provider} API key in Settings first.`);
      return;
    }
    setError('');
    const next: ChatMessage[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await api.aiChat(
        trip.id,
        provider,
        next.map((m) => ({ role: m.role, content: m.content })),
        provider === 'gemini' ? geminiModel : undefined
      );
      setMessages([
        ...next,
        { role: 'assistant', content: r.reply, toolCalls: r.toolCalls },
      ]);
      if (r.trip) onTripUpdated(r.trip);
      if (r.toolCalls?.length) {
        toast.success(
          `AI applied ${r.toolCalls.length} change${r.toolCalls.length === 1 ? '' : 's'}`
        );
      }
    } catch (e: any) {
      const msg = friendlyAIError(e.message);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const optimize = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.aiOptimize(trip.id);
      onTripUpdated(updated);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Reordered stops using nearest-neighbor optimization.',
        },
      ]);
      toast.success('Itinerary optimized');
    } catch (e: any) {
      const msg = friendlyAIError(e.message);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-col max-h-[60vh] lg:max-h-[420px]">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Bot className="w-4 h-4 text-brand-600" /> AI Agent
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <select
            className="input py-1 text-xs"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            title="Provider"
          >
            <option value="openai">
              OpenAI {hasKey('openai') ? '' : '(no key)'}
            </option>
            <option value="gemini">
              Gemini {hasKey('gemini') ? '' : '(no key)'}
            </option>
          </select>
          {provider === 'gemini' && (
            <select
              className="input py-1 text-xs"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
              title="Gemini model"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m} value={m}>
                  {GEMINI_MODEL_LABELS[m]}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn-ghost text-xs"
            onClick={optimize}
            disabled={busy || trip.steps.length < 3}
            title="Nearest-neighbor reorder"
          >
            <Sparkles className="w-3.5 h-3.5" /> Optimize
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-slate-500 text-xs">
            Try: <em>"Add Kyoto and Osaka, set transport between them to train"</em>{' '}
            or <em>"Optimize the order for the shortest route"</em>.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[90%] px-3 py-2 rounded-lg whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700'
              }`}
            >
              {m.content || (m.toolCalls?.length ? '(tool actions performed)' : '')}
            </div>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <ul className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                {m.toolCalls.map((t, j) => (
                  <li key={j} className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    <span className="font-mono">{t.name}</span>
                    {t.error && (
                      <span className="text-red-500">— {t.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && <div className="text-xs text-slate-500">Thinking…</div>}
      </div>

      {error && (
        <div className="px-3 py-2 text-xs text-red-600 border-t border-slate-200 dark:border-slate-700">
          {error}{' '}
          {!hasKey(provider) && (
            <button className="underline" onClick={onOpenSettings}>
              Open settings
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-2 border-t border-slate-200 dark:border-slate-700 flex gap-1"
      >
        <input
          className="input"
          placeholder="Ask the AI to edit your trip…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
