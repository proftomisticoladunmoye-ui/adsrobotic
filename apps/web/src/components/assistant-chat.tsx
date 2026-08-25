'use client';

import { useRef, useState } from 'react';
import { Badge, Button, Card, Input, NetworkSignature } from '@adsrobotic/ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  confidence?: string;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  early_signal: 'Early signal',
  more_data_needed: 'More data needed',
};

const SUGGESTIONS = [
  'What should we advertise next week?',
  'Where should I spend my budget?',
  'Why are my ads performing poorly?',
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    const nextMessages: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/v1/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.text, confidence: data.confidence },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
    }
  }

  return (
    <Card className="flex h-[70vh] flex-col">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <NetworkSignature className="h-10 w-10" />
            <p className="mt-4 max-w-sm text-sm text-ar-muted">
              Ask your AI advertising employee anything. It answers using your business memory and
              live campaign data.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-ar-border px-3 py-1.5 text-xs text-ar-text hover:border-ar-blue-bright"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-ar-blue px-4 py-3 text-sm text-ar-white">
                {m.content}
              </div>
            ) : (
              <div key={i} className="flex max-w-[92%] gap-3">
                <NetworkSignature className="mt-1 h-7 w-7 shrink-0" animated={false} />
                <div className="rounded-lg rounded-tl-sm border border-ar-border bg-ar-background px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-ar-text">{m.content}</p>
                  {m.confidence ? (
                    <Badge tone="ai" className="mt-2">
                      {CONFIDENCE_LABEL[m.confidence] ?? m.confidence}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ),
          )
        )}
        {busy ? <p className="text-sm text-ar-muted">AdsRobotic is thinking…</p> : null}
        {error ? <p className="text-sm text-ar-critical">{error}</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-ar-border p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AdsRobotic…"
          disabled={busy}
        />
        <Button type="submit" variant="ai" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
