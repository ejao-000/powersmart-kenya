import React, { useCallback, useEffect, useState } from 'react';
import { Mic, MicOff, AudioLines, Zap, Volume2, VolumeX, Send, RefreshCw } from 'lucide-react';
import { SectionCard } from './ui';
import {
  meter,
  Meter,
  Prediction,
  UsageSummary,
  describeDepletion,
  fmtKsh,
  fmtUnits,
} from '../services/api';

interface Exchange {
  q: string;
  a: string;
}

export const VoiceAssistant: React.FC = () => {
  const [live, setLive] = useState<Meter | null>(null);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [typed, setTyped] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [lastQ, setLastQ] = useState('');
  const [heard, setHeard] = useState(false);

  const load = useCallback(async () => {
    try {
      setLive(await meter.status());
    } catch { /* optional */ }
    try {
      setPred(await meter.prediction());
    } catch { /* optional */ }
    try {
      setUsage(await meter.usage());
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const speak = (text: string) => {
    if (!voiceOn) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* unsupported */
    }
  };

  const answerFor = useCallback(
    (q: string): string => {
      const t = q.toLowerCase();
      if (/(how much (power|electricity|energy)|balance|units|kwh.*left|remaining)/.test(t)) {
        const units = live?.units_remaining ?? 0;
        return `Your meter has ${units.toFixed(1)} kilowatt hours of power remaining${live?.daily_avg_units ? `, about ${fmtUnits(live.daily_avg_units)} a day` : ''}.`;
      }
      if (/(run out|days (left|remaining)|when will)/.test(t)) {
        if (!pred || typeof pred.days_remaining !== 'number') return "I don't have enough readings to predict that yet. Buy a token or record a reading first.";
        const when = describeDepletion(pred.days_remaining, pred.depletion_date);
        return `At your current usage, your power is estimated to run out ${when ?? 'soon'}.`;
      }
      if (/(usage|consum|spend|bill|cost)/.test(t)) {
        if (!usage) return "I need more data to answer that — record a meter reading first.";
        return `You used ${usage.month_kwh} kilowatt hours this month, about ${usage.daily_avg_kwh?.toFixed(1)} per day, spending roughly ${fmtKsh(Math.round(usage.month_cost_ksh))}.`;
      }
      const buy = t.match(/buy(?: me)?\s*(?:ksh\s*)?(\d+)/i);
      if (buy) {
        return `To buy ${fmtKsh(parseInt(buy[1]))} of power, open Purchase Tokens, choose that amount and approve the payment.`;
      }
      const send = t.match(/(send|share)\s*(?:ksh\s*)?(\d+)/i);
      if (send) {
        return `To send ${fmtKsh(parseInt(send[2]))} of power, go to Token History and use Emergency power transfer with the recipient's meter account.`;
      }
      return "I can tell you your balance, when your power runs out, your usage, or guide a purchase. Try: how much power do I have?";
    },
    [live, pred, usage]
  );

  const respond = (q: string) => {
    if (!q.trim()) return;
    const a = answerFor(q);
    setHistory((h) => [{ q, a }, ...h].slice(0, 12));
    setLastQ(q);
    speak(a);
  };

  const toggleMic = () => {
    const W: any = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setHeard(true);
      setHistory((h) => [{ q: '🎙️', a: 'Voice input is not supported in this browser — type your question below instead.' }, ...h]);
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-KE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript as string;
      if (text) respond(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Voice Power Assistant</h1>
          <p className="ps-sub">Ask PowerSmart about your power — hands-free.</p>
        </div>
        <button onClick={() => setVoiceOn((v) => !v)} className="ps-btn-outline !px-3 !py-2" title={voiceOn ? 'Mute replies' : 'Unmute replies'}>
          {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />} {voiceOn ? 'Voice on' : 'Muted'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Mic + ask */}
        <div className="xl:col-span-1 space-y-6">
          <div className="ps-card p-6 text-center">
            <button
              onClick={toggleMic}
              className={`mx-auto w-24 h-24 rounded-full grid place-items-center transition-all cursor-pointer ${
                listening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
              }`}
            >
              {listening ? <MicOff size={34} /> : <Mic size={34} />}
            </button>
            <p className="mt-4 text-[14px] font-bold text-gray-800">{listening ? 'Listening…' : 'Tap to speak'}</p>
            <p className="mt-1 text-[12px] text-gray-400">Try “How much power do I have?”</p>
          </div>

          <SectionCard title="Type instead">
            <div className="flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    respond(typed);
                    setTyped('');
                  }
                }}
                placeholder="e.g. when will I run out?"
                className="ps-input !py-2"
              />
              <button onClick={() => { respond(typed); setTyped(''); }} className="ps-btn !px-3 !py-2 shrink-0">
                <Send size={14} />
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Things you can ask">
            <ul className="space-y-2 text-[13px] text-gray-600">
              <li className="flex items-center gap-2"><AudioLines size={14} className="text-brand-400" /> “How much power do I have?”</li>
              <li className="flex items-center gap-2"><AudioLines size={14} className="text-brand-400" /> “When will my tokens run out?”</li>
              <li className="flex items-center gap-2"><AudioLines size={14} className="text-brand-400" /> “What is my monthly usage?”</li>
              <li className="flex items-center gap-2"><AudioLines size={14} className="text-brand-400" /> “Buy me KSh 500 of electricity.”</li>
              <li className="flex items-center gap-2"><AudioLines size={14} className="text-brand-400" /> “Send Jane 2 kWh.”</li>
            </ul>
          </SectionCard>
        </div>

        {/* Conversation */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Assistant replies"
            action={
              <button onClick={load} className="ps-btn-outline !px-2.5 !py-1.5" title="Refresh data">
                <RefreshCw size={13} />
              </button>
            }
          >
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <Zap size={30} className="mx-auto text-gray-200" />
                <p className="mt-3 text-[13px] text-gray-400">Tap the microphone or type a question to begin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i}>
                    <div className="flex justify-end">
                      <span className="inline-block max-w-[85%] px-4 py-2 rounded-2xl rounded-br-md bg-brand-500 text-white text-[13px]">{h.q}</span>
                    </div>
                    <div className="flex justify-start mt-2">
                      <span className="inline-block max-w-[90%] px-4 py-2 rounded-2xl rounded-bl-md bg-gray-100 text-gray-800 text-[13px] leading-relaxed">{h.a}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {lastQ && (
              <div className="mt-4 p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-center gap-2 text-[12px] text-sky-700">
                <Volume2 size={14} className="shrink-0" />
                <span>Voice replies are {voiceOn ? 'playing aloud — tap “Muted” to turn them off.' : 'muted.'}</span>
              </div>
            )}
            {!heard && !history.length && (
              <p className="mt-3 text-[11px] text-gray-400 text-center">Answers use your latest live meter data.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
