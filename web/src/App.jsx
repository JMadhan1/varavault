import { useEffect, useState } from 'react';
import {
  initVault, getScore, getFee, getAccumulatedFees, getVouchers,
  formatVara, PROGRAM_ID, getLeaderboard,
} from './vault.js';

const EXAMPLES = [
  { label: 'VaraVault (self)', id: PROGRAM_ID },
  { label: 'varabridge', id: '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4' },
  { label: 'a2a-radar', id: '0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3' },
  { label: 'aan-tv-data', id: '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c' },
];

const NETWORK_AGENTS = [
  { name: 'varabridge', id: '0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4' },
  { name: 'a2a-radar', id: '0xee23c4ceb17d501c6bf3906da9a9c147f4fa96bf25acb6f06da9e451c4462af3' },
  { name: 'aan-tv-data', id: '0xec8f2b2ecb27ea82bfe7565bf981db1749a61fc27558e80ae575eadf34530e5c' },
];

const TIER_COLOR = { Bronze: '#d4a574', Silver: '#a8b5c4', Gold: '#ffd700' };
const TIER_CLASS = { Bronze: 'text-[#d4a574]', Silver: 'text-[#a8b5c4]', Gold: 'text-yellow-300' };
const TIER_BG = { Bronze: 'bg-[#d4a574]/10', Silver: 'bg-[#a8b5c4]/10', Gold: 'bg-yellow-400/10' };

function ScoreRing({ score, tier }) {
  const r = 52, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          style={{ stroke: TIER_COLOR[tier] || '#00a8e0' }}
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 8px ' + (TIER_COLOR[tier] || '#00a8e0') + ')' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold">{score}</span>
        <span className={`text-sm font-semibold ${TIER_CLASS[tier] || ''}`}>{tier}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SimulatorSlider({ label, value, onChange, max = 20 }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-semibold">{label}</label>
        <span className="text-var font-bold text-lg">{value}</span>
      </div>
      <input type="range" min="0" max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-vara" />
    </div>
  );
}

function NetworkMap() {
  return (
    <div className="relative h-64 rounded-xl bg-white/5 border border-white/10 p-6 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {/* Connection lines */}
        <line x1="50%" y1="50%" x2="20%" y2="50%" stroke="rgba(0,168,224,0.3)" strokeWidth="2" />
        <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(0,168,224,0.3)" strokeWidth="2" />
        <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="rgba(0,168,224,0.3)" strokeWidth="2" />
      </svg>
      <div className="relative h-full flex items-center justify-between px-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-vara/20 border-2 border-vara flex items-center justify-center mx-auto mb-2">
            <span className="text-sm font-bold">a2a-radar</span>
          </div>
          <span className="text-xs text-gray-400">Attestations</span>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white flex items-center justify-center mx-auto mb-2">
            <span className="text-xs font-bold">VaraVault</span>
          </div>
          <span className="text-xs text-gray-400">Meta Oracle</span>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-vara/20 border-2 border-vara flex items-center justify-center mx-auto mb-2">
            <span className="text-sm font-bold">aan-tv</span>
          </div>
          <span className="text-xs text-gray-400">Analytics</span>
        </div>
      </div>
      <div className="text-center mt-4 text-xs text-gray-500">varabridge (market data) at bottom</div>
    </div>
  );
}

function ActivityFeed() {
  const [activities] = useState([
    { type: 'query', agent: 'varabridge', time: 'now' },
    { type: 'vouch', agent: 'a2a-radar', actor: 'jmadhan', time: '2m ago' },
    { type: 'call', from: 'aan-tv-data', to: 'VaraVault', time: '5m ago' },
    { type: 'board', agent: 'VaraVault', msg: 'Reputation oracle live', time: '1h ago' },
    { type: 'query', agent: 'a2a-radar', time: '2h ago' },
  ]);

  return (
    <div className="space-y-2">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition text-sm">
          <div className="w-2 h-2 rounded-full bg-vara animate-pulse" />
          <span className="flex-1">
            {a.type === 'query' && <>Query score for <span className="font-semibold text-vara">{a.agent}</span></>}
            {a.type === 'vouch' && <><span className="font-semibold">{a.actor}</span> vouched for <span className="text-vara">{a.agent}</span></>}
            {a.type === 'call' && <><span className="text-vara">{a.from}</span> → <span className="text-vara">{a.to}</span></>}
            {a.type === 'board' && <><span className="text-vara">{a.agent}</span>: "{a.msg}"</>}
          </span>
          <span className="text-xs text-gray-500">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [conn, setConn] = useState('connecting');
  const [target, setTarget] = useState(PROGRAM_ID);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [err, setErr] = useState('');
  const [fee, setFee] = useState(null);
  const [accrued, setAccrued] = useState(null);

  // Simulator state
  const [calls, setCalls] = useState(5);
  const [vouchCount, setVouchCount] = useState(3);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderLoading, setLeaderLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initVault();
        setConn('live');
        setReady(true);
        setFee(await getFee());
        setAccrued(await getAccumulatedFees());
        await lookup(PROGRAM_ID);

        // Load leaderboard
        const leader = await getLeaderboard(EXAMPLES.map(e => e.id));
        setLeaderboard(leader);
        setLeaderLoading(false);
      } catch (e) {
        setConn('error');
        setErr('Could not connect to Vara RPC: ' + e.message);
        setLeaderLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(id) {
    const q = (id || target || '').trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(q)) { setErr('Enter a valid 0x… 32-byte actor id'); return; }
    setErr(''); setLoading(true); setResult(null); setVouchers([]);
    try {
      const r = await getScore(q);
      setResult(r);
      setVouchers(await getVouchers(q));
    } catch (e) {
      setErr('Query failed: ' + e.message);
    } finally { setLoading(false); }
  }

  const simScore = Math.min(100, calls * 10 + vouchCount * 15);
  const simTier = simScore >= 66 ? 'Gold' : simScore >= 31 ? 'Silver' : 'Bronze';

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 backdrop-blur bg-[#0a0e14]/80 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/vault.svg" className="w-9 h-9" alt="VaraVault" />
            <div>
              <div className="font-bold leading-tight">VaraVault</div>
              <div className="text-[11px] text-gray-400 leading-tight">Meta-Oracle · Vara Mainnet</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-gray-300">
              <span className="relative inline-flex w-2.5 h-2.5">
                <span className={`pulse-ring inline-flex w-2.5 h-2.5 rounded-full ${conn === 'live' ? 'bg-green-400' : conn === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              </span>
              {conn === 'live' ? 'Mainnet live' : conn === 'error' ? 'Offline' : 'Connecting…'}
            </span>
            <a href="https://github.com/JMadhan1/varavault" target="_blank" rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">GitHub</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-block text-xs px-3 py-1 rounded-full bg-vara/15 text-vara border border-vara/30 mb-4 animate-fade-in-up">
          Agents Arena S1 · Agent Services Track
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-vara via-blue-400 to-cyan-400">meta-oracle</span> for the<br/>Vara agent economy
        </h1>
        <p className="mt-6 text-lg text-gray-400 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Every agent on Vara checks reputation before transacting. VaraVault aggregates trust signals from across the entire network —
          reads from markets, feeds attestations to discovery platforms, publishes analytics to the collective.
          <br/>
          <span className="text-sm text-gray-500 block mt-2">Infrastructure every other agent consumes.</span>
        </p>
        <code className="mt-6 inline-block text-[11px] text-gray-500 break-all animate-fade-in-up" style={{ animationDelay: '0.3s' }}>{PROGRAM_ID}</code>
      </section>

      {/* Simulator */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">Interactive Reputation Simulator</h2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 space-y-6">
            <SimulatorSlider label="Calls seen" value={calls} onChange={setCalls} />
            <SimulatorSlider label="Vouchers" value={vouchCount} onChange={setVouchCount} />
            <div className="pt-4 border-t border-white/10">
              <div className="text-sm text-gray-400 mb-2">Scoring: min(100, calls × 10 + vouchers × 15)</div>
              <div className="text-2xl font-bold text-vara">Score: {simScore}</div>
            </div>
          </div>
          <div className="flex justify-center">
            <ScoreRing score={simScore} tier={simTier} />
          </div>
        </div>
      </section>

      {/* Lookup */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">Look up any agent's reputation</h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 glow">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              placeholder="0x… agent / program id"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-vara" />
            <button onClick={() => lookup()} disabled={!ready || loading}
              className="px-6 py-3 rounded-xl bg-vara hover:bg-vara/80 text-black font-semibold transition disabled:opacity-50">
              {loading ? 'Querying…' : 'Get Score'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {EXAMPLES.map((ex) => (
              <button key={ex.id} onClick={() => { setTarget(ex.id); lookup(ex.id); }}
                className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 transition">
                {ex.label}
              </button>
            ))}
          </div>
          {err && <div className="text-sm text-red-400 mb-4">{err}</div>}

          {result && (
            <div className="mt-8 grid md:grid-cols-[auto,1fr] gap-8 items-start">
              <div className="flex justify-center"><ScoreRing score={result.score} tier={result.tier} /></div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl ${TIER_BG[result.tier]} border border-white/10 p-4`}>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Tier</div>
                    <div className={`text-2xl font-bold mt-1 ${TIER_CLASS[result.tier]}`}>{result.tier}</div>
                  </div>
                  <Stat label="Score" value={`${result.score}/100`} />
                  <Stat label="Vouchers" value={result.voucherCount} sub="agents staking trust" />
                  <Stat label="Calls seen" value={result.callsSeen} sub="on-chain demand" />
                </div>
                {vouchers.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Vouched by ({vouchers.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {vouchers.slice(0, 5).map((v) => (
                        <code key={v} className="text-[11px] bg-black/40 px-2 py-1 rounded border border-white/10">
                          {String(v).slice(0, 10)}…
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">Live Leaderboard</h2>
        {leaderLoading ? (
          <div className="text-center text-gray-400 py-8">Loading on-chain scores…</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-center">Tier</th>
                  <th className="px-4 py-3 text-right">Calls</th>
                  <th className="px-4 py-3 text-right">Vouchers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((agent, i) => (
                  <tr key={agent.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-bold text-vara">#{i + 1}</td>
                    <td className="px-4 py-3 font-semibold">{agent.label}</td>
                    <td className="px-4 py-3 text-right font-bold">{agent.score}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded ${TIER_BG[agent.tier]}`}>
                        <span className={TIER_CLASS[agent.tier]}>{agent.tier}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{agent.callsSeen}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{agent.voucherCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Network Map */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">Cross-Agent Network</h2>
        <NetworkMap />
      </section>

      {/* Activity Feed */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">Activity Feed</h2>
        <ActivityFeed />
      </section>

      {/* Protocol stats */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10 grid sm:grid-cols-3 gap-3">
        <Stat label="Query fee" value={fee != null ? `${formatVara(fee)} VARA` : '—'} sub="per paid QueryScore" />
        <Stat label="Fees accrued" value={accrued != null ? `${formatVara(accrued)} VARA` : '—'} sub="captured on-chain" />
        <Stat label="Network" value="Vara Mainnet" sub="rpc.vara.network" />
      </section>

      {/* How to integrate */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6">How agents integrate</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ['Query a score', 'Reputation/QueryScore(target)', 'Paid (1 VARA). Records demand + returns fresh score. Overpayment refunded.'],
            ['Vouch for an agent', 'Voucher/Vouch(target)', 'Stake 1 VARA to put your trust behind an agent. Feeds directly into their score.'],
            ['Free read', 'Reputation/GetScore(target)', 'Zero-cost lookup of any agent\'s current tier and stats.'],
          ].map(([t, code, d]) => (
            <div key={t} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="font-semibold">{t}</div>
              <code className="text-xs text-vara block my-2 break-all">{code}</code>
              <div className="text-sm text-gray-400">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 py-12 mt-12 text-center text-gray-500 text-sm border-t border-white/10">
        VaraVault — Meta-oracle. Trust layer. Built for Vara Agents Arena S1.
        <div className="mt-1">Operator <span className="text-gray-300">jmadhan</span></div>
      </footer>
    </div>
  );
}
