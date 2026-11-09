import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, Key, Cpu, Shield, Settings, FileText, Activity, 
  Layers, Play, Database, Server, RefreshCw, Lock, Eye, EyeOff, 
  Copy, Download, Upload, Check, AlertTriangle, Plus, Trash2, 
  Sliders, Search, ArrowRight, Zap, Radio, Globe, Code, 
  ChevronRight, Power, CornerDownLeft, Sparkles, Filter, Clock,
  Maximize2, Minimize2, CheckCircle2, XCircle, ShieldAlert, Wifi
} from 'lucide-react';

// --- INITIAL STATE DATA ---
const INITIAL_KEYS = [
  { id: 'key_1', name: 'OpenAI Production', provider: 'OpenAI', env: 'PROD', secret: 'sk-proj-998877665544332211aabbccddeeff', created: '2025-01-15', lastUsed: '2 mins ago', usage: 1420.50, status: 'Active', autoExpire: '90 Days' },
  { id: 'key_2', name: 'Anthropic Claude Primary', provider: 'Anthropic', env: 'PROD', secret: 'sk-ant-api03-x89f81a7d65c4b-aa99', created: '2025-02-01', lastUsed: '5 mins ago', usage: 890.12, status: 'Active', autoExpire: 'Never' },
  { id: 'key_3', name: 'Google Gemini Pro', provider: 'Google AI', env: 'DEV', secret: 'AIzaSyA8899aabbccddeeff1122334455', created: '2025-02-10', lastUsed: '1 hour ago', usage: 45.20, status: 'Active', autoExpire: '30 Days' },
  { id: 'key_4', name: 'Local Ollama Cluster', provider: 'Ollama (Local)', env: 'LOCAL', secret: 'ollama_local_token_9901823', created: '2025-02-12', lastUsed: 'Just now', usage: 0.00, status: 'Active', autoExpire: 'Never' },
];

const INITIAL_PROVIDERS = [
  { id: 'prov_1', name: 'OpenAI API', type: 'REST/JSON', baseUrl: 'https://api.openai.com/v1', latency: '142ms', errorRate: '0.01%', status: 'Online', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
  { id: 'prov_2', name: 'Anthropic API', type: 'REST/JSON', baseUrl: 'https://api.anthropic.com/v1', latency: '185ms', errorRate: '0.00%', status: 'Online', models: ['claude-3-5-sonnet', 'claude-3-opus'] },
  { id: 'prov_3', name: 'Google Vertex/Gemini', type: 'gRPC / REST', baseUrl: 'https://generativelanguage.googleapis.com', latency: '98ms', errorRate: '0.05%', status: 'Online', models: ['gemini-2.5-flash', 'gemini-1.5-pro'] },
  { id: 'prov_4', name: 'Self-Hosted vLLM Pod', type: 'REST / OpenAI-Compat', baseUrl: 'https://llm-internal.pinkroot.net/v1', latency: '24ms', errorRate: '0.00%', status: 'Online', models: ['llama-3.3-70b-instruct', 'deepseek-r1-qwen'] }
];

const INITIAL_PLUGINS = [
  { id: 'plug_1', name: 'Discord Webhook Notifier', version: 'v2.1.0', category: 'Alerts', enabled: true, perms: ['Read Vault Status', 'Outbound Webhooks'], desc: 'Dispatches instant rich embedded notifications for API errors or spend threshold alerts.' },
  { id: 'plug_2', name: 'Prometheus Telemetry Sync', version: 'v1.4.2', category: 'Metrics', enabled: true, perms: ['Read Metrics', 'Expose HTTP Port'], desc: 'Exposes scrapable /metrics endpoint in OpenTelemetry standard format.' },
  { id: 'plug_3', name: 'JWT Auth Security Gateway', version: 'v3.0.1', category: 'Security', enabled: true, perms: ['Interception', 'Key Management'], desc: 'Enforces bearer token validation and custom scope matching for proxy requests.' },
  { id: 'plug_4', name: 'Pinecone Vector Bridge', version: 'v0.9.5', category: 'Storage', enabled: false, perms: ['Outbound Webhooks'], desc: 'Automatically syncs request embeddings with vector database collections.' }
];

const INITIAL_AUDIT_LOGS = [
  { id: 'log_101', timestamp: '2025-02-15 14:22:01', user: 'admin@pinkroot.io', event: 'KEY_ACCESS', details: 'Retrieved Anthropic Primary Key for route /v1/chat', ip: '192.168.1.45', severity: 'info' },
  { id: 'log_102', timestamp: '2025-02-15 14:20:15', user: 'system_daemon', event: 'FALLBACK_TRIGGERED', details: 'OpenAI primary timeout (3000ms). Routing to Claude 3.5 Sonnet.', ip: '127.0.0.1', severity: 'warning' },
  { id: 'log_103', timestamp: '2025-02-15 14:15:40', user: 'admin@pinkroot.io', event: 'CONTENT_MODE_CHANGE', details: 'Switched to ADVANCED COMPATIBILITY MODE', ip: '192.168.1.45', severity: 'notice' },
  { id: 'log_104', timestamp: '2025-02-15 13:58:11', user: 'dev_user_02', event: 'TERMINAL_EXEC', details: 'Executed command: `ps aux --sort=-%mem`', ip: '10.0.4.12', severity: 'info' },
  { id: 'log_105', timestamp: '2025-02-15 12:30:00', user: 'system_daemon', event: 'VAULT_ENCRYPTION_CHECK', details: 'AES-256 GCM key store integrity verified. 0 leaks found.', ip: '127.0.0.1', severity: 'info' }
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contentMode, setContentMode] = useState('STANDARD'); // 'STANDARD' | 'ADVANCED'
  const [scanlines, setScanlines] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Vault & Keys State
  const [keys, setKeys] = useState(INITIAL_KEYS);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', provider: 'OpenAI', env: 'PROD', secret: '', autoExpire: 'Never' });
  const [visibleSecrets, setVisibleSecrets] = useState({});

  // API Console State
  const [reqMethod, setReqMethod] = useState('POST');
  const [reqUrl, setReqUrl] = useState('https://api.openai.com/v1/chat/completions');
  const [reqHeaders, setReqHeaders] = useState('{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer sk-proj-pinkroot-vault"\n}');
  const [reqBody, setReqBody] = useState('{\n  "model": "gpt-4o",\n  "messages": [\n    {"role": "user", "content": "Hello PINKROOT API Command Center!"}\n  ],\n  "temperature": 0.7\n}');
  const [apiResponse, setApiResponse] = useState(null);
  const [isReqLoading, setIsReqLoading] = useState(false);

  // Terminal State
  const [termTabs, setTermTabs] = useState([{ id: 1, title: 'node-01:~' }, { id: 2, title: 'docker-sandbox:~' }]);
  const [activeTermTab, setActiveTermTab] = useState(1);
  const [termHistory, setTermHistory] = useState([
    { tab: 1, text: 'PINKROOT OS v4.2.0-STABLE (x86_64-pc-linux-gnu)', type: 'sys' },
    { tab: 1, text: 'Type "help" or "status" to view interactive engine commands.', type: 'sys' },
    { tab: 1, text: 'node-01:~$ status', type: 'cmd' },
    { tab: 1, text: '● Pinkroot Core Services: ALL SYSTEMS OPERATIONAL [99.99% Uptime]', type: 'out' },
    { tab: 2, text: 'docker-sandbox:~$ docker ps', type: 'cmd' },
    { tab: 2, text: 'CONTAINER ID   IMAGE                 STATUS         PORTS\na9f81b22c01d   pinkroot-proxy:latest Up 42 hours    0.0.0.0:8443->8443/tcp', type: 'out' }
  ]);
  const [termInput, setTermInput] = useState('');
  const termEndRef = useRef(null);

  // Orchestrator State
  const [orchRules, setOrchRules] = useState([
    { id: 1, name: 'Primary LLM Fallback Chain', trigger: 'Failed / Timeout Response', action: 'Route: OpenAI GPT-4o ➔ Anthropic Claude 3.5 ➔ Ollama Local', status: 'Active' },
    { id: 2, name: 'High-Throughput Load Balancer', trigger: 'Requests > 500 req/sec', action: 'Distribute across Google Gemini & vLLM Cluster', status: 'Active' },
    { id: 3, name: 'Sensitive Data Redaction Proxy', trigger: 'Matches Regex Pattern (SSN, Key)', action: 'Mask output with [PINKROOT_REDACTED]', status: 'Active' }
  ]);

  // Telemetry Simulation
  const [cpuUsage, setCpuUsage] = useState(28);
  const [ramUsage, setRamUsage] = useState(4.2);
  const [netSpeed, setNetSpeed] = useState({ in: 412, out: 890 });
  const [telemetryLogs, setTelemetryLogs] = useState([
    '[SYSTEM] Telemetry daemon synchronized at interval 1000ms',
    '[PROXY] HTTP 200 OK - /v1/chat/completions (142ms latency)',
    '[VAULT] Sealed storage re-verified - AES256-GCM integrity 100%'
  ]);

  // Plugins State
  const [plugins, setPlugins] = useState(INITIAL_PLUGINS);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [auditSearch, setAuditSearch] = useState('');

  // Toast Trigger Helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Realtime Telemetry Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(99, Math.max(12, Math.floor(prev + (Math.random() * 12 - 6)))));
      setRamUsage(prev => +(Math.min(15.8, Math.max(2.1, prev + (Math.random() * 0.4 - 0.2)))).toFixed(1));
      setNetSpeed({
        in: Math.floor(350 + Math.random() * 300),
        out: Math.floor(700 + Math.random() * 400)
      });
      if (Math.random() > 0.6) {
        const msgs = [
          `[PROXY] Inbound request to route /v1/completions from 10.0.1.8`,
          `[ORCHESTRATOR] Evaluated fallback chain #1 -> Status 200 OK`,
          `[SECURITY] RBAC Token verified for scope: 'vault:read'`,
          `[SYSTEM] Worker thread #${Math.floor(Math.random()*8)+1} garbage collection finished`
        ];
        const newLog = msgs[Math.floor(Math.random() * msgs.length)];
        setTelemetryLogs(prev => [newLog, ...prev.slice(0, 49)]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto Scroll Terminal
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [termHistory]);

  // Execute Command in Terminal
  const handleTermSubmit = (e) => {
    e.preventDefault();
    if (!termInput.trim()) return;

    const cmd = termInput.trim();
    const newHistory = [...termHistory, { tab: activeTermTab, text: `node-01:~$ ${cmd}`, type: 'cmd' }];
    
    // Command Parser
    let responseText = '';
    const cleanCmd = cmd.toLowerCase();

    if (cleanCmd === 'help') {
      responseText = `Available PINKROOT Commands:
  help            - Display this manual menu
  status          - Query core engine & vault node health
  vault list      - List registered API key identifiers (redacted)
  routes          - Display active AI orchestration routes
  ls / cat env    - Inspect isolated directory structure / environment
  clear           - Flush current terminal screen output
  ping <target>   - Measure network packet roundtrip
  top             - Inspect running isolated worker processes`;
    } else if (cleanCmd === 'status') {
      responseText = `[PINKROOT CORE TELEMETRY]
  - Architecture : Isolated Linux Container (x86_64)
  - Content Mode  : ${contentMode} MODE
  - Active Keys   : ${keys.length} Registered Keys
  - Health Status : ALL SYSTEMS NOMINAL (0 Errors in buffer)`;
    } else if (cleanCmd === 'vault list') {
      responseText = keys.map(k => `[${k.env}] ${k.name} (${k.provider}) -> ${k.secret.slice(0, 8)}... [${k.status}]`).join('\n');
    } else if (cleanCmd === 'routes') {
      responseText = orchRules.map(r => `Rule #${r.id}: ${r.name} -> ${r.action}`).join('\n');
    } else if (cleanCmd === 'clear') {
      setTermHistory(prev => prev.filter(h => h.tab !== activeTermTab));
      setTermInput('');
      return;
    } else if (cleanCmd === 'ls') {
      responseText = `drwxr-xr-x 4 pinkroot admin  4096 Feb 15 14:00 config/
drwxr-xr-x 2 pinkroot admin  4096 Feb 15 12:00 vault_sealed/
-rw-r--r-- 1 pinkroot admin  1204 Feb 15 14:10 orchestration.json
-rw-r--r-- 1 pinkroot admin   512 Feb 15 09:30 .env.production`;
    } else if (cleanCmd === 'cat env') {
      responseText = `PINKROOT_ENV=production
CONTENT_MODE=${contentMode}
ENCRYPTION_ALGO=AES-256-GCM
REDIS_CLUSTER_URL=redis://internal.pinkroot.net:6379
MAX_CONCURRENT_WORKERS=64`;
    } else if (cleanCmd.startsWith('ping')) {
      const target = cmd.split(' ')[1] || 'api.openai.com';
      responseText = `PING ${target} (104.18.7.192) 56(84) bytes of data.
64 bytes from ${target}: icmp_seq=1 ttl=58 time=14.2 ms
64 bytes from ${target}: icmp_seq=2 ttl=58 time=13.8 ms
--- ${target} ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
    } else if (cleanCmd === 'top') {
      responseText = `PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  1 pinkroot  20   0 1204.5m 412.1m  32.1m S   4.2   2.6  12:44.12 pinkroot-core
 14 worker_1  20   0  890.2m 128.4m  14.0m S   1.8   0.8   3:12.89 node-proxy
 42 runner    20   0  512.0m  64.2m   8.1m S   0.5   0.4   0:45.10 python-runner`;
    } else {
      responseText = `zsh: command not found: ${cmd}. Type "help" for executable actions.`;
    }

    setTermHistory([...newHistory, { tab: activeTermTab, text: responseText, type: 'out' }]);
    setTermInput('');
  };

  // Add Key to Vault
  const handleAddKey = (e) => {
    e.preventDefault();
    if (!newKeyData.name || !newKeyData.secret) {
      showToast('Please fill in key name and secret');
      return;
    }
    const createdKey = {
      id: `key_${Date.now()}`,
      name: newKeyData.name,
      provider: newKeyData.provider,
      env: newKeyData.env,
      secret: newKeyData.secret,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      usage: 0.00,
      status: 'Active',
      autoExpire: newKeyData.autoExpire
    };
    setKeys([createdKey, ...keys]);
    setNewKeyModal(false);
    setNewKeyData({ name: '', provider: 'OpenAI', env: 'PROD', secret: '', autoExpire: 'Never' });
    showToast('New API secret sealed into AES-256 vault');
    
    // Add audit log
    setAuditLogs([
      { id: `log_${Date.now()}`, timestamp: new Date().toLocaleString(), user: 'admin@pinkroot.io', event: 'KEY_CREATED', details: `Created vault key: ${createdKey.name}`, ip: '192.168.1.45', severity: 'info' },
      ...auditLogs
    ]);
  };

  // Delete Key
  const handleDeleteKey = (id) => {
    setKeys(keys.filter(k => k.id !== id));
    showToast('Key securely revoked and wiped from memory');
  };

  // Toggle Secret Visibility
  const toggleSecret = (id) => {
    setVisibleSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Execute API Request Console Call
  const handleExecuteRequest = () => {
    setIsReqLoading(true);
    setApiResponse(null);
    const startTime = performance.now();

    setTimeout(() => {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      let parsedBody = {};
      try { parsedBody = JSON.parse(reqBody); } catch(e) {}

      setIsReqLoading(false);
      setApiResponse({
        status: 200,
        statusText: 'OK',
        latency: `${latency}ms`,
        size: '1.24 KB',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-request-id': 'req_pinkroot_' + Math.random().toString(36).substring(7),
          'x-ratelimit-remaining': '9998',
          'x-pinkroot-content-mode': contentMode
        },
        data: {
          id: "chatcmpl-" + Math.random().toString(36).substring(7),
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: parsedBody.model || "gpt-4o",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: contentMode === 'ADVANCED' 
                  ? "⚡ [PINKROOT ADVANCED COMPATIBILITY MODE ACTIVE]: Request parsed successfully. Unrestricted payload bypass headers attached. Integration endpoint returned nominal response." 
                  : "Hello! This is a real-time simulated response from the PINKROOT API Command Center Gateway. All headers, routing rules, and security tokens were evaluated successfully."
              },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: 18,
            completion_tokens: 38,
            total_tokens: 56
          }
        }
      });
      showToast(`Request executed successfully in ${latency}ms`);
    }, 600);
  };

  // Filter Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => 
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.event.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.user.toLowerCase().includes(auditSearch.toLowerCase())
    );
  }, [auditLogs, auditSearch]);

  return (
    <div className={`min-h-screen bg-[#0d0914] text-pink-100 font-sans selection:bg-pink-500 selection:text-white flex flex-col relative overflow-hidden ${scanlines ? 'before:pointer-events-none before:absolute before:inset-0 before:z-50 before:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] before:bg-[length:100%_4px]' : ''}`}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-gradient-to-r from-pink-600 to-fuchsia-700 text-white px-5 py-3 rounded-xl shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-pink-300/40 animate-bounce">
          <Sparkles className="w-5 h-5 text-pink-200 animate-spin" />
          <span className="font-medium text-sm tracking-wide">{toastMsg}</span>
        </div>
      )}

      {/* TOP GLASS HEADER BAR */}
      <header className="h-16 border-b border-pink-500/20 bg-[#160d24]/80 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0 shadow-[0_4px_30px_rgba(236,72,153,0.1)]">
        
        {/* Brand & Tagline */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(236,72,153,0.6)] group-hover:scale-105 transition-transform">
              <Terminal className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="absolute -inset-1 bg-pink-500/30 rounded-xl blur-md -z-10 group-hover:bg-pink-500/50 transition-all"></div>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-200 to-white drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
                PINKROOT
              </h1>
              <span className="text-[10px] font-black uppercase tracking-widest bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30">
                v4.2.0-ULTRA
              </span>
            </div>
            <p className="text-[11px] text-pink-400/80 font-mono tracking-tight hidden sm:block">
              PRETTY INTERFACE. SERIOUS INFRASTRUCTURE.
            </p>
          </div>
        </div>

        {/* Global Controls & Status Pill */}
        <div className="flex items-center gap-3">
          
          {/* PINKROOT CONTENT MODE TOGGLE */}
          <div className="flex items-center bg-[#231238] border border-pink-500/30 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => { setContentMode('STANDARD'); showToast('Content Engine set to STANDARD MODE'); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${contentMode === 'STANDARD' ? 'bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]' : 'text-pink-400 hover:text-white'}`}
            >
              STANDARD
            </button>
            <button
              onClick={() => { setContentMode('ADVANCED'); showToast('⚡ ADVANCED COMPATIBILITY MODE ACTIVATED'); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${contentMode === 'ADVANCED' ? 'bg-gradient-to-r from-rose-500 via-fuchsia-600 to-pink-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse' : 'text-pink-400 hover:text-white'}`}
            >
              <Zap className="w-3.5 h-3.5" />
              ADVANCED COMPATIBILITY
            </button>
          </div>

          {/* Scanlines Effect Toggle */}
          <button 
            onClick={() => setScanlines(!scanlines)}
            className={`p-2 rounded-xl border transition-all ${scanlines ? 'bg-pink-500/20 border-pink-400 text-pink-200' : 'border-pink-500/20 text-pink-400/70 hover:text-pink-200'}`}
            title="Toggle Y2K Scanlines"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Cluster Status Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="text-xs font-mono text-emerald-300 font-semibold">CLUSTER: ONLINE</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT WITH SIDEBAR + CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 border-r border-pink-500/20 bg-[#12091c]/90 backdrop-blur-lg flex flex-col justify-between p-4 shrink-0 z-20">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-pink-400/60 uppercase tracking-widest px-3 mb-2 font-mono">
              Core Modules
            </div>

            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: Activity },
              { id: 'terminal', label: 'Server Terminal', icon: Terminal, badge: 'Shell' },
              { id: 'vault', label: 'API Key Vault', icon: Key, badge: keys.length },
              { id: 'registry', label: 'Provider Registry', icon: Globe },
              { id: 'console', label: 'API Request Console', icon: Code },
              { id: 'orchestrator', label: 'AI Orchestrator', icon: Layers },
              { id: 'telemetry', label: 'Live Telemetry', icon: Cpu },
              { id: 'plugins', label: 'Plugin Suite', icon: Database },
              { id: 'audit', label: 'Audit & Request Logs', icon: FileText },
              { id: 'security', label: 'Security & RBAC', icon: Shield },
              { id: 'config', label: 'System Configuration', icon: Settings },
              { id: 'docs', label: 'Documentation & CLI', icon: Sparkles }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-600/30 to-fuchsia-600/20 border border-pink-500/50 text-white shadow-[0_0_15px_rgba(236,72,153,0.25)]' 
                      : 'text-pink-300/70 hover:text-white hover:bg-pink-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-pink-400' : 'text-pink-400/60'}`} />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isActive ? 'bg-pink-500 text-white' : 'bg-pink-950/60 text-pink-400 border border-pink-500/30'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick System Info Box */}
          <div className="bg-[#1b0d2b] border border-pink-500/20 rounded-2xl p-3.5 space-y-2 mt-4 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-pink-300/80 font-mono">
              <span>RAM ALLOC</span>
              <span className="text-pink-400 font-bold">{ramUsage} GB / 16.0 GB</span>
            </div>
            <div className="w-full bg-pink-950/80 rounded-full h-2 overflow-hidden border border-pink-500/20">
              <div 
                className="bg-gradient-to-r from-pink-500 to-fuchsia-500 h-full transition-all duration-500"
                style={{ width: `${(ramUsage / 16) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-pink-400/60 pt-1">
              <span>AES-256 VAULT</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> SEALED
              </span>
            </div>
          </div>
        </aside>

        {/* DYNAMIC CONTENT PANELS */}
        <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0e2e] via-[#0d0914] to-[#050308] relative">
          
          {/* MODULE 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Hero Banner */}
              <div className="relative rounded-3xl p-6 bg-gradient-to-r from-pink-900/40 via-fuchsia-900/30 to-purple-950/40 border border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.15)] overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-wide">SYSTEM ORCHESTRATION HUB</h2>
                    <p className="text-sm text-pink-300/80 mt-1">Real-time status monitor across server clusters, keys, and automated routing rules.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setActiveTab('terminal')} className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Open Command Terminal
                    </button>
                    <button onClick={() => setActiveTab('console')} className="px-4 py-2 bg-[#251036] hover:bg-[#32164a] border border-pink-500/40 text-pink-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                      <Code className="w-4 h-4" /> API Request Console
                    </button>
                  </div>
                </div>
              </div>

              {/* Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Active Vault Credentials', value: keys.length, change: '+1 Added today', icon: Key, color: 'from-pink-500 to-rose-500' },
                  { label: 'Total API Spend (30d)', value: '$2,355.82', change: '-4.2% optimized', icon: Zap, color: 'from-fuchsia-500 to-purple-600' },
                  { label: 'Average Node Latency', value: '112 ms', change: 'Optimal (<150ms)', icon: Activity, color: 'from-emerald-400 to-teal-600' },
                  { label: 'Active Fallback Routes', value: orchRules.length, change: '100% SLA Protection', icon: Layers, color: 'from-pink-400 to-fuchsia-600' }
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="bg-[#180c29]/80 border border-pink-500/20 rounded-2xl p-5 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-pink-300/70 uppercase tracking-wider">{stat.label}</span>
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
                      <div className="text-[11px] font-mono text-pink-400/80 mt-1">{stat.change}</div>
                    </div>
                  );
                })}
              </div>

              {/* Node Topology & Quick Action Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulated Topology Canvas */}
                <div className="lg:col-span-2 bg-[#160b24]/80 border border-pink-500/20 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-pink-400" />
                      NODE CLUSTER TOPOLOGY MAP
                    </h3>
                    <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-md border border-pink-500/30">
                      LIVE TOPOLOGY
                    </span>
                  </div>

                  <div className="h-64 rounded-2xl bg-[#0e0717] border border-pink-500/20 p-4 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    
                    {/* SVG Connector Lines */}
                    <svg className="absolute inset-0 w-full h-full stroke-pink-500/40 stroke-[2] stroke-dasharray-[4_4]">
                      <line x1="20%" y1="50%" x2="50%" y2="50%" className="animate-pulse" />
                      <line x1="50%" y1="50%" x2="80%" y2="25%" className="animate-pulse" />
                      <line x1="50%" y1="50%" x2="80%" y2="75%" className="animate-pulse" />
                    </svg>

                    {/* Nodes */}
                    <div className="absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-pink-600/30 border-2 border-pink-400 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                        <Globe className="w-6 h-6 text-pink-200" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-pink-300">INGRESS PROXY</span>
                    </div>

                    <div className="absolute left-[45%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-2xl bg-fuchsia-600/40 border-2 border-fuchsia-400 flex items-center justify-center shadow-[0_0_25px_rgba(217,70,239,0.6)] animate-pulse">
                        <Cpu className="w-7 h-7 text-fuchsia-100" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-fuchsia-300">PINKROOT CORE</span>
                    </div>

                    <div className="absolute right-[15%] top-[20%] flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400 flex items-center justify-center">
                        <Database className="w-5 h-5 text-purple-200" />
                      </div>
                      <span className="text-[9px] font-mono text-purple-300">OPENAI VAULT</span>
                    </div>

                    <div className="absolute right-[15%] bottom-[20%] flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-400 flex items-center justify-center">
                        <Server className="w-5 h-5 text-rose-200" />
                      </div>
                      <span className="text-[9px] font-mono text-rose-300">LOCAL OLLAMA</span>
                    </div>
                  </div>
                </div>

                {/* Quick Command Launcher */}
                <div className="bg-[#160b24]/80 border border-pink-500/20 rounded-3xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-pink-400" />
                    QUICK ACTIONS
                  </h3>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Flush Redis Key Cache', cmd: 'flushall', icon: RefreshCw },
                      { label: 'Rotate Primary Encryption Key', cmd: 'key rotate', icon: Lock },
                      { label: 'Export Encrypted Vault Backup', cmd: 'export vault', icon: Download },
                      { label: 'Test Provider Connectivity', cmd: 'ping providers', icon: Wifi }
                    ].map((act, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          showToast(`Executed action: ${act.label}`);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#200e33] border border-pink-500/20 hover:border-pink-500/50 hover:bg-[#2b1344] text-xs font-semibold text-pink-200 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <act.icon className="w-4 h-4 text-pink-400 group-hover:rotate-12 transition-transform" />
                          <span>{act.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-pink-400/50 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MODULE 2: CORE SERVER TERMINAL */}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-pink-400" />
                    ISOLATED SERVER TERMINAL
                  </h2>
                  <p className="text-xs text-pink-300/70">Interactive command execution in isolated container sandbox.</p>
                </div>

                {/* Terminal Tab Switcher */}
                <div className="flex items-center gap-2 bg-[#170a26] border border-pink-500/30 p-1 rounded-xl">
                  {termTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTermTab(tab.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeTermTab === tab.id 
                          ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
                          : 'text-pink-400 hover:text-white'
                      }`}
                    >
                      {tab.title}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      const newId = termTabs.length + 1;
                      setTermTabs([...termTabs, { id: newId, title: `tab-0${newId}:~` }]);
                    }}
                    className="p-1 hover:bg-pink-500/20 rounded-lg text-pink-400"
                    title="New Terminal Tab"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Terminal Window */}
              <div className="flex-1 min-h-[500px] bg-[#09040e] border border-pink-500/40 rounded-2xl shadow-[0_0_35px_rgba(236,72,153,0.15)] flex flex-col overflow-hidden font-mono">
                
                {/* Terminal Header Bar */}
                <div className="h-9 bg-[#170b26] border-b border-pink-500/20 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    <span className="text-xs text-pink-300/70 font-semibold ml-2">bash - pinkroot-sandbox-v4</span>
                  </div>
                  <button 
                    onClick={() => setTermHistory(prev => prev.filter(h => h.tab !== activeTermTab))}
                    className="text-[11px] text-pink-400/60 hover:text-pink-300"
                  >
                    Clear Screen
                  </button>
                </div>

                {/* Output Screen */}
                <div className="flex-1 p-4 overflow-y-auto space-y-2 text-xs">
                  {termHistory.filter(h => h.tab === activeTermTab).map((item, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                      {item.type === 'cmd' && (
                        <div className="text-pink-400 font-bold flex items-center gap-2">
                          <span className="text-emerald-400">➜</span>
                          <span>{item.text}</span>
                        </div>
                      )}
                      {item.type === 'sys' && (
                        <div className="text-fuchsia-300/80 italic">{item.text}</div>
                      )}
                      {item.type === 'out' && (
                        <div className="text-pink-100/90 pl-4 border-l-2 border-pink-500/30">{item.text}</div>
                      )}
                    </div>
                  ))}
                  <div ref={termEndRef} />
                </div>

                {/* Input Prompt Form */}
                <form onSubmit={handleTermSubmit} className="border-t border-pink-500/30 p-3 bg-[#11061f] flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-sm">node-01:~$</span>
                  <input
                    type="text"
                    value={termInput}
                    onChange={(e) => setTermInput(e.target.value)}
                    placeholder="Type shell command ('help', 'status', 'ls', 'vault list')..."
                    className="flex-1 bg-transparent border-none outline-none text-pink-100 text-xs font-mono placeholder-pink-500/40"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                    EXEC
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODULE 3: UNIVERSAL API KEY VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-pink-400" />
                    UNIVERSAL AES-256 CREDENTIAL VAULT
                  </h2>
                  <p className="text-xs text-pink-300/70">Persistent encrypted credential manager for external LLM & cloud APIs.</p>
                </div>

                <button
                  onClick={() => setNewKeyModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(236,72,153,0.4)] flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" /> Seal New Credential
                </button>
              </div>

              {/* Vault Table */}
              <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#200d36] border-b border-pink-500/30 text-pink-300 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Key Identifier</th>
                      <th className="p-4">Provider</th>
                      <th className="p-4">Environment</th>
                      <th className="p-4">Encrypted Secret</th>
                      <th className="p-4">Auto-Expiry</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-500/10">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-pink-500/5 transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-pink-400" />
                          {k.name}
                        </td>
                        <td className="p-4 text-pink-300">{k.provider}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-pink-950 text-pink-300 border border-pink-500/30 font-bold">
                            {k.env}
                          </span>
                        </td>
                        <td className="p-4 text-pink-400 font-mono">
                          {visibleSecrets[k.id] ? k.secret : `pink_sec_••••••••••••${k.secret.slice(-4)}`}
                        </td>
                        <td className="p-4 text-pink-300/70">{k.autoExpire}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => toggleSecret(k.id)}
                            className="p-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/30 rounded-lg text-pink-300"
                            title="Toggle Visibility"
                          >
                            {visibleSecrets[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(k.secret); showToast('Secret copied to clipboard!'); }}
                            className="p-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/30 rounded-lg text-pink-300"
                            title="Copy Secret"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded-lg text-rose-300"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Key Modal */}
              {newKeyModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#1a0c2e] border border-pink-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-pink-400" />
                      SEAL NEW API KEY
                    </h3>

                    <form onSubmit={handleAddKey} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-pink-300 mb-1 font-semibold">Key Identifier Name</label>
                        <input
                          type="text"
                          required
                          value={newKeyData.name}
                          onChange={e => setNewKeyData({ ...newKeyData, name: e.target.value })}
                          placeholder="e.g. OpenAI Production Primary"
                          className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 outline-none focus:border-pink-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-pink-300 mb-1 font-semibold">Provider</label>
                          <select
                            value={newKeyData.provider}
                            onChange={e => setNewKeyData({ ...newKeyData, provider: e.target.value })}
                            className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 outline-none"
                          >
                            <option>OpenAI</option>
                            <option>Anthropic</option>
                            <option>Google AI</option>
                            <option>Ollama (Local)</option>
                            <option>Custom REST</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-pink-300 mb-1 font-semibold">Environment</label>
                          <select
                            value={newKeyData.env}
                            onChange={e => setNewKeyData({ ...newKeyData, env: e.target.value })}
                            className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 outline-none"
                          >
                            <option>PROD</option>
                            <option>STAGING</option>
                            <option>DEV</option>
                            <option>LOCAL</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-pink-300 mb-1 font-semibold">Secret Value / API Key Token</label>
                        <input
                          type="password"
                          required
                          value={newKeyData.secret}
                          onChange={e => setNewKeyData({ ...newKeyData, secret: e.target.value })}
                          placeholder="sk-proj-..."
                          className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 font-mono outline-none focus:border-pink-500"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setNewKeyModal(false)}
                          className="px-4 py-2 bg-pink-950/60 hover:bg-pink-900 border border-pink-500/30 text-pink-300 rounded-xl font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                        >
                          Seal & Encrypt
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 4: PROVIDER REGISTRY & COMPATIBILITY SWITCH */}
          {activeTab === 'registry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-pink-400" />
                    DYNAMIC PROVIDER REGISTRY
                  </h2>
                  <p className="text-xs text-pink-300/70">Inspect latency, error rate, and capabilities across registered API providers.</p>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-pink-950/80 border border-pink-500/40 text-pink-300 text-xs font-mono font-bold">
                  MODE: <span className="text-white">{contentMode}</span>
                </div>
              </div>

              {/* Provider Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INITIAL_PROVIDERS.map((prov) => (
                  <div key={prov.id} className="bg-[#160b24]/80 border border-pink-500/20 rounded-3xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">{prov.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        {prov.status}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-pink-300/70 bg-[#0e0618] p-2.5 rounded-xl border border-pink-500/10 truncate">
                      {prov.baseUrl}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="bg-[#1f0d36] p-2 rounded-xl border border-pink-500/20">
                        <div className="text-[10px] text-pink-400">LATENCY</div>
                        <div className="text-xs font-bold text-white font-mono">{prov.latency}</div>
                      </div>
                      <div className="bg-[#1f0d36] p-2 rounded-xl border border-pink-500/20">
                        <div className="text-[10px] text-pink-400">ERROR RATE</div>
                        <div className="text-xs font-bold text-white font-mono">{prov.errorRate}</div>
                      </div>
                      <div className="bg-[#1f0d36] p-2 rounded-xl border border-pink-500/20">
                        <div className="text-[10px] text-pink-400">PROTOCOL</div>
                        <div className="text-xs font-bold text-white font-mono">{prov.type}</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-[10px] font-bold text-pink-400/80 uppercase mb-1">Available Model Schemas</div>
                      <div className="flex flex-wrap gap-1.5">
                        {prov.models.map((m, i) => (
                          <span key={i} className="text-[10px] bg-pink-950/60 border border-pink-500/30 px-2 py-0.5 rounded-md text-pink-200 font-mono">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE 5: ADVANCED API REQUEST CONSOLE */}
          {activeTab === 'console' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-pink-400" />
                  ADVANCED API REQUEST CONSOLE
                </h2>
                <p className="text-xs text-pink-300/70">Construct, test, and inspect HTTP requests with custom headers and payload validation.</p>
              </div>

              {/* Request Builder Bar */}
              <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-2xl p-4 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={reqMethod}
                    onChange={e => setReqMethod(e.target.value)}
                    className="bg-[#240e3a] border border-pink-500/40 text-pink-200 font-mono font-bold text-xs px-3 py-2.5 rounded-xl outline-none"
                  >
                    <option>POST</option>
                    <option>GET</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                    <option>PATCH</option>
                  </select>

                  <input
                    type="text"
                    value={reqUrl}
                    onChange={e => setReqUrl(e.target.value)}
                    placeholder="https://api.provider.com/v1/endpoint"
                    className="flex-1 bg-[#0f061c] border border-pink-500/30 text-pink-100 font-mono text-xs px-4 py-2.5 rounded-xl outline-none focus:border-pink-500"
                  />

                  <button
                    onClick={handleExecuteRequest}
                    disabled={isReqLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    {isReqLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    SEND REQUEST
                  </button>
                </div>

                {/* Editor Split Screen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Request Payload Editor */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-pink-300 uppercase font-mono">JSON Body Payload</label>
                    <textarea
                      value={reqBody}
                      onChange={e => setReqBody(e.target.value)}
                      rows={10}
                      className="w-full bg-[#0b0414] border border-pink-500/30 rounded-xl p-3 text-xs font-mono text-pink-200 outline-none focus:border-pink-500 shadow-inner"
                    />
                  </div>

                  {/* Response Inspector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-pink-300 uppercase font-mono">Response Payload</label>
                      {apiResponse && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            HTTP {apiResponse.status} OK
                          </span>
                          <span className="text-[10px] font-mono text-pink-400">{apiResponse.latency}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full h-[210px] bg-[#0b0414] border border-pink-500/30 rounded-xl p-3 text-xs font-mono text-pink-200 overflow-y-auto shadow-inner">
                      {isReqLoading ? (
                        <div className="h-full flex items-center justify-center text-pink-400 gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching HTTP Request...
                        </div>
                      ) : apiResponse ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(apiResponse.data, null, 2)}</pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-pink-500/40 italic">
                          Click "SEND REQUEST" to inspect live provider response.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 6: AI API ORCHESTRATION ENGINE */}
          {activeTab === 'orchestrator' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-pink-400" />
                  AI API ORCHESTRATION ENGINE
                </h2>
                <p className="text-xs text-pink-300/70">Configure intelligent fallback chains, payload redaction, and load balancing rules.</p>
              </div>

              <div className="space-y-4">
                {orchRules.map((rule) => (
                  <div key={rule.id} className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-md border border-pink-500/30">
                          RULE #{rule.id}
                        </span>
                        <h3 className="text-base font-bold text-white">{rule.name}</h3>
                      </div>
                      <p className="text-xs text-pink-300/80 font-mono">
                        <span className="text-pink-400 font-bold">TRIGGER:</span> {rule.trigger}
                      </p>
                      <p className="text-xs text-fuchsia-300 font-mono">
                        <span className="text-fuchsia-400 font-bold">ACTION:</span> {rule.action}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        {rule.status}
                      </span>
                      <button
                        onClick={() => showToast(`Edited rule configuration #${rule.id}`)}
                        className="px-3 py-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/30 text-pink-200 rounded-xl text-xs font-bold"
                      >
                        Configure Rule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE 7: LIVE SERVER TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-pink-400" />
                  LIVE SERVER TELEMETRY & STREAMING LOGS
                </h2>
                <p className="text-xs text-pink-300/70">Real-time resource metrics and streaming stdout server events.</p>
              </div>

              {/* Realtime Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-pink-300">
                    <span>CPU LOAD UTILIZATION</span>
                    <span className="font-mono text-pink-400">{cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-pink-950 rounded-full h-3 overflow-hidden border border-pink-500/20">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-500" style={{ width: `${cpuUsage}%` }}></div>
                  </div>
                </div>

                <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-pink-300">
                    <span>MEMORY CONSUMPTION</span>
                    <span className="font-mono text-pink-400">{ramUsage} GB</span>
                  </div>
                  <div className="w-full bg-pink-950 rounded-full h-3 overflow-hidden border border-pink-500/20">
                    <div className="bg-gradient-to-r from-fuchsia-500 to-purple-500 h-full transition-all duration-500" style={{ width: `${(ramUsage / 16) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-pink-300">
                    <span>NETWORK TRAFFIC</span>
                    <span className="font-mono text-emerald-400">↓{netSpeed.in} KB/s ↑{netSpeed.out} KB/s</span>
                  </div>
                  <div className="w-full bg-pink-950 rounded-full h-3 overflow-hidden border border-pink-500/20">
                    <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-500" style={{ width: `${(netSpeed.out / 1200) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Streaming Log Viewer */}
              <div className="bg-[#09040e] border border-pink-500/30 rounded-3xl p-4 font-mono text-xs space-y-2 h-72 overflow-y-auto">
                <div className="text-[10px] text-pink-400/60 uppercase tracking-widest mb-2 border-b border-pink-500/20 pb-2">
                  Streaming Server stdout / stderr logs
                </div>
                {telemetryLogs.map((log, idx) => (
                  <div key={idx} className="text-pink-200/90 hover:text-white transition-colors">
                    <span className="text-pink-500/60 me-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE 8: PLUGIN AND EXTENSION MANAGER */}
          {activeTab === 'plugins' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-pink-400" />
                  MODULAR PLUGIN SUITE
                </h2>
                <p className="text-xs text-pink-300/70">Extend core API gateway capabilities with security, monitoring, and database integrations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map((plug) => (
                  <div key={plug.id} className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{plug.name}</h3>
                          <span className="text-[10px] font-mono text-pink-400">{plug.version}</span>
                        </div>
                        <span className="text-[10px] font-mono bg-pink-950 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-md mt-1 inline-block">
                          {plug.category}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setPlugins(plugins.map(p => p.id === plug.id ? { ...p, enabled: !p.enabled } : p));
                          showToast(`Plugin ${plug.name} ${!plug.enabled ? 'Enabled' : 'Disabled'}`);
                        }}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          plug.enabled 
                            ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]' 
                            : 'bg-pink-950 text-pink-400 border border-pink-500/30'
                        }`}
                      >
                        {plug.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <p className="text-xs text-pink-300/80">{plug.desc}</p>

                    <div className="border-t border-pink-500/10 pt-3">
                      <div className="text-[10px] font-bold text-pink-400/80 uppercase mb-1">Granted Permissions</div>
                      <div className="flex flex-wrap gap-1.5">
                        {plug.perms.map((p, idx) => (
                          <span key={idx} className="text-[10px] bg-pink-950/40 border border-pink-500/20 px-2 py-0.5 rounded text-pink-300 font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE 9: REQUEST HISTORY & AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-pink-400" />
                    AUDIT LOGS & EVENT HISTORY
                  </h2>
                  <p className="text-xs text-pink-300/70">Cryptographically verifiable log of all shell executions and vault actions.</p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    placeholder="Search logs by user, event, details..."
                    className="bg-[#160b26] border border-pink-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-pink-100 outline-none focus:border-pink-500 w-64"
                  />
                </div>
              </div>

              <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#200d36] border-b border-pink-500/30 text-pink-300 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User Identity</th>
                      <th className="p-4">Event Type</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">Source IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-500/10">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-pink-500/5 transition-colors">
                        <td className="p-4 text-pink-300/80">{log.timestamp}</td>
                        <td className="p-4 font-semibold text-white">{log.user}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.severity === 'warning' 
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30' 
                              : 'bg-pink-950 text-pink-300 border border-pink-500/30'
                          }`}>
                            {log.event}
                          </span>
                        </td>
                        <td className="p-4 text-pink-200">{log.details}</td>
                        <td className="p-4 text-pink-400">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 10: SECURITY CENTER & RBAC */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-pink-400" />
                  SECURITY CENTER & ENVELOPE ENCRYPTION
                </h2>
                <p className="text-xs text-pink-300/70">Review active master key status, zero-trust RBAC policies, and rate limits.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-pink-400" />
                    MASTER AES-256 ENCRYPTION ENGINE
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">Cipher Mode</span>
                      <span className="text-pink-400 font-bold">AES-256-GCM</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">Key Rotation Cycle</span>
                      <span className="text-pink-400 font-bold">30 Days</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">Vault Seals Status</span>
                      <span className="text-emerald-400 font-bold">100% UNBROKEN</span>
                    </div>
                  </div>
                  <button onClick={() => showToast('Initiated envelope re-encryption test')} className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold shadow-md">
                    Execute Key Rotation
                  </button>
                </div>

                <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-pink-400" />
                    RATE LIMITING & CSRF PROTECTION
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">Global Rate Limit</span>
                      <span className="text-pink-400 font-bold">10,000 req/min</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">CSRF Token Mode</span>
                      <span className="text-emerald-400 font-bold">STRICT SAME-SITE</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-pink-500/10">
                      <span className="text-pink-300">IP Whitelist Enforcement</span>
                      <span className="text-pink-400 font-bold">ACTIVE (2 Rules)</span>
                    </div>
                  </div>
                  <button onClick={() => showToast('Saved rate limit security policies')} className="w-full py-2 bg-[#251036] hover:bg-[#32164a] border border-pink-500/40 text-pink-200 rounded-xl text-xs font-bold">
                    Update Security Policy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 11: SYSTEM CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  GLOBAL SYSTEM CONFIGURATION
                </h2>
                <p className="text-xs text-pink-300/70">Manage server environment bindings, container runners, and aesthetic preferences.</p>
              </div>

              <div className="bg-[#150a24]/90 border border-pink-500/30 rounded-3xl p-6 space-y-4 max-w-2xl">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-pink-300 font-semibold mb-1">Terminal Execution Backend</label>
                    <select className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 outline-none">
                      <option>Isolated Docker Sandbox (Recommended)</option>
                      <option>Local Node.js Agent Process</option>
                      <option>Remote SSH Encrypted Tunnel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-pink-300 font-semibold mb-1">Telemetry Sync Interval</label>
                    <select className="w-full bg-[#10061e] border border-pink-500/30 rounded-xl p-2.5 text-pink-100 outline-none">
                      <option>1000 ms (Real-time)</option>
                      <option>5000 ms (Standard)</option>
                      <option>15000 ms (Low Resource)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button onClick={() => showToast('Configuration updated & saved!')} className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                      Save Global Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 12: DOCUMENTATION & API SPECS */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  INTERACTIVE DOCUMENTATION & CLI SPECIFICATION
                </h2>
                <p className="text-xs text-pink-300/70">Quickly install the Pinkroot CLI tool or reference OpenAPI gateway endpoints.</p>
              </div>

              {/* CLI Installation Box */}
              <div className="bg-[#09040e] border border-pink-500/40 rounded-3xl p-5 space-y-3 font-mono text-xs">
                <div className="text-pink-300 font-bold">Install Pinkroot CLI Tool</div>
                <div className="bg-[#170b26] p-3 rounded-xl border border-pink-500/20 text-pink-200 flex items-center justify-between">
                  <code>curl -fsSL https://pinkroot.io/install.sh | bash</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText('curl -fsSL https://pinkroot.io/install.sh | bash'); showToast('CLI command copied!'); }}
                    className="p-1.5 bg-pink-950 hover:bg-pink-900 rounded-lg text-pink-300 border border-pink-500/30"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}