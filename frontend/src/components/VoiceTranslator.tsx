import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, ArrowLeftRight, Languages, X } from 'lucide-react';
import { api } from '../api';
import {
  type AIProvider,
  type GeminiModel,
  GEMINI_MODELS,
  GEMINI_MODEL_LABELS,
  DEFAULT_GEMINI_MODEL,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { friendlyAIError } from '../utils/aiErrors';

const LANGUAGES = [
  { code: 'en-US', label: 'English', short: 'English' },
  { code: 'es-ES', label: 'Spanish (Spain)', short: 'Spanish' },
  { code: 'fr-FR', label: 'French', short: 'French' },
  { code: 'de-DE', label: 'German', short: 'German' },
  { code: 'it-IT', label: 'Italian', short: 'Italian' },
  { code: 'pt-PT', label: 'Portuguese', short: 'Portuguese' },
  { code: 'nl-NL', label: 'Dutch', short: 'Dutch' },
  { code: 'ja-JP', label: 'Japanese', short: 'Japanese' },
  { code: 'ko-KR', label: 'Korean', short: 'Korean' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', short: 'Chinese' },
  { code: 'ar-SA', label: 'Arabic', short: 'Arabic' },
  { code: 'hi-IN', label: 'Hindi', short: 'Hindi' },
];

function langShort(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.short || code;
}

// Browser SpeechRecognition typings vary; use any.
const SpeechRecognition: any =
  (typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition)) ||
  null;

export function VoiceTranslator({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const { user } = useAuth();
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(
    DEFAULT_GEMINI_MODEL
  );
  const [from, setFrom] = useState('en-US');
  const [to, setTo] = useState('es-ES');
  const [listening, setListening] = useState(false);
  const [source, setSource] = useState('');
  const [translated, setTranslated] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const hasKey = (p: AIProvider) => Boolean(user?.apiKeys?.[p]);

  useEffect(() => {
    if (!hasKey('openai') && hasKey('gemini')) setProvider('gemini');
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const speak = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = langCode;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const startListening = () => {
    setError('');
    if (!SpeechRecognition) {
      setError(
        'Speech recognition is not supported in this browser. Try Chrome / Edge.'
      );
      return;
    }
    if (!hasKey(provider)) {
      setError(`Add a ${provider} API key in Settings first.`);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = from;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      setError(`Mic error: ${e.error || 'unknown'}`);
    };
    rec.onresult = async (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      setSource(text);
      if (!text) return;
      setBusy(true);
      try {
        const r = await api.aiTranslate(
          provider,
          text,
          langShort(from),
          langShort(to),
          provider === 'gemini' ? geminiModel : undefined
        );
        setTranslated(r.translated);
        speak(r.translated, to);
      } catch (err: any) {
        setError(friendlyAIError(err.message));
      } finally {
        setBusy(false);
      }
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setSource(translated);
    setTranslated(source);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Languages className="w-5 h-5 text-brand-600" /> Voice Translator
          </h2>
          <button className="btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label className="label">From</label>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-ghost mb-1" onClick={swap} title="Swap">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <div>
            <label className="label">To</label>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Provider</label>
            <select
              className="input"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
            >
              <option value="openai">OpenAI {hasKey('openai') ? '' : '(no key)'}</option>
              <option value="gemini">Gemini {hasKey('gemini') ? '' : '(no key)'}</option>
            </select>
          </div>
          {provider === 'gemini' && (
            <div>
              <label className="label">Model</label>
              <select
                className="input"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {GEMINI_MODEL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {listening ? (
            <button className="btn-danger" onClick={stopListening}>
              <MicOff className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button className="btn-primary" onClick={startListening} disabled={busy}>
              <Mic className="w-4 h-4" /> {busy ? 'Translating…' : 'Speak'}
            </button>
          )}
        </div>

        <div>
          <label className="label">Heard ({langShort(from)})</label>
          <div className="card p-3 min-h-[3rem] text-sm whitespace-pre-wrap">
            {source || <span className="text-slate-400">…</span>}
          </div>
        </div>

        <div>
          <label className="label flex items-center justify-between">
            <span>Translation ({langShort(to)})</span>
            {translated && (
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                onClick={() => speak(translated, to)}
              >
                <Volume2 className="w-3.5 h-3.5" /> Play
              </button>
            )}
          </label>
          <div className="card p-3 min-h-[3rem] text-sm whitespace-pre-wrap">
            {translated || <span className="text-slate-400">…</span>}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}{' '}
            {!hasKey(provider) && (
              <button className="underline" onClick={onOpenSettings}>
                Open settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
