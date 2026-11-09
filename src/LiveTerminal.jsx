import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function LiveTerminal({ serverUrl, token }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !token) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      theme: {
        background: '#09040e',
        foreground: '#fce7f3',
        cursor: '#ec4899',
        cursorAccent: '#09040e',
        selectionBackground: '#ec489980',
        black: '#1a0a24',
        red: '#fb7185',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#e879f9',
        cyan: '#22d3ee',
        white: '#fce7f3',
        brightBlack: '#6b7280',
        brightRed: '#fda4af',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#f0abfc',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    try { fit.fit(); } catch {}

    const base = (serverUrl || window.location.origin).replace(/\/$/, '');
    const proto = base.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${base.replace(/^https?/, proto)}/ws/terminal?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    const sendResize = () => {
      try { fit.fit(); } catch {}
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    ws.onopen = () => sendResize();
    ws.onmessage = (ev) => {
      term.write(typeof ev.data === 'string' ? ev.data : String(ev.data));
    };
    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mWebSocket error — is the PINKROOT server running?\x1b[0m');
    };
    ws.onclose = () => {
      term.writeln('\r\n\x1b[33mTerminal disconnected.\x1b[0m');
    };

    const dataHook = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    window.addEventListener('resize', sendResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sendResize) : null;
    if (ro) ro.observe(el);

    return () => {
      dataHook.dispose();
      window.removeEventListener('resize', sendResize);
      if (ro) ro.disconnect();
      try { ws.close(); } catch {}
      term.dispose();
    };
  }, [serverUrl, token]);

  return <div ref={containerRef} className="flex-1 min-h-[420px] w-full p-2" />;
}
