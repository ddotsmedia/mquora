'use client';

import { useState, useRef, useCallback } from 'react';
import { Quote, X, Download } from 'lucide-react';

interface AnswerQuoteCardProps {
  answerId: string;
  authorName: string;
  questionTitle: string;
  siteUrl?: string;
}

/** Select a sentence from an answer and render a shareable image card. */
export function AnswerQuoteCard({ authorName, questionTitle, siteUrl = 'askvyo.com' }: AnswerQuoteCardProps) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const [customQuote, setCustomQuote] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  const captureSelection = useCallback(() => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 10 && sel.length < 280) {
      setQuote(sel);
      setCustomQuote(sel);
      setOpen(true);
      setGenerated(false);
    }
  }, []);

  const generate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800, H = 420;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f2319');
    grad.addColorStop(1, '#1a3a28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent bar
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 0, 6, H);

    // Large quote mark
    ctx.font = 'bold 120px Georgia, serif';
    ctx.fillStyle = 'rgba(74,222,128,0.15)';
    ctx.fillText('"', 30, 130);

    // Quote text (word-wrap)
    const text = customQuote || quote;
    ctx.font = '500 22px "Noto Sans Malayalam", Georgia, serif';
    ctx.fillStyle = '#f0fdf4';
    const words = text.split(' ');
    let line = '';
    let y = 120;
    const maxWidth = W - 120;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, 80, y);
        line = word;
        y += 36;
        if (y > 280) { ctx.fillText(line + '…', 80, y); line = ''; break; }
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 80, y);

    // Author
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`— ${authorName}`, 80, H - 80);

    // Context
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(240,253,244,0.5)';
    const qTitle = questionTitle.length > 60 ? questionTitle.slice(0, 57) + '…' : questionTitle;
    ctx.fillText(`Answering: ${qTitle}`, 80, H - 50);

    // Brand
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'right';
    ctx.fillText(siteUrl, W - 30, H - 24);

    setGenerated(true);
  }, [quote, customQuote, authorName, questionTitle, siteUrl]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `askvyo-quote-${Date.now()}.png`;
    a.click();
  }, []);

  return (
    <>
      <button
        onMouseUp={captureSelection}
        onClick={() => { setQuote(''); setCustomQuote(''); setOpen(true); setGenerated(false); }}
        title="Create quote card from this answer"
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)] transition-colors"
        aria-label="Share quote from this answer"
      >
        <Quote className="h-3.5 w-3.5" />
        Quote
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Create quote card">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Create quote card</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-[var(--surface-2)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">
              Quote text <span className="text-[var(--text-muted)]">(select from answer or type)</span>
            </label>
            <textarea
              value={customQuote}
              onChange={(e) => { setCustomQuote(e.target.value); setGenerated(false); }}
              placeholder="Highlight text in the answer, or type a quote here…"
              rows={3}
              maxLength={280}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] resize-none"
            />
            <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{customQuote.length}/280</p>

            <canvas ref={canvasRef} className={`mt-4 w-full rounded-xl ${generated ? 'block' : 'hidden'}`} style={{ aspectRatio: '800/420' }} />

            <div className="mt-4 flex gap-2">
              <button
                onClick={generate}
                disabled={!customQuote.trim()}
                className="flex-1 rounded-full bg-[var(--primary)] py-2 text-sm font-semibold text-white hover:bg-[var(--primary-light)] disabled:opacity-40 transition-colors"
              >
                Preview card
              </button>
              {generated && (
                <button
                  onClick={download}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
