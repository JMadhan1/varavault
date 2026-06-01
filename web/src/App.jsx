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

const TIER_COLORS = { Bronze: '#d4a574', Silver: '#a8b5c4', Gold: '#ffd700' };
const TIER_CLASS = { Bronze: 'text-[#d4a574]', Silver: 'text-[#a8b5c4]', Gold: 'text-yellow-300' };
const TIER_BG = { Bronze: 'bg-[#d4a574]/15', Silver: 'bg-[#a8b5c4]/15', Gold: 'bg-yellow-400/15' };

function AnimatedGradientBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-vara/20 rounded-full blur-3xl animate-pulse opacity-30" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse opacity-20" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse opacity-25" style={{ animationDelay: '2s' }} />
    </div>
  );
}

function ScoreRing({ score, tier }) {
  const r = 60, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className="relative w-56 h-56 animate-float">
      <div className="absolute inset-0 rounded-full" style={{
        background: `radial-gradient(circle at 30% 30%, ${TIER_COLORS[tier]}20, transparent)`,
        filter: `drop-shadow(0 0 30px ${TIER_COLORS[tier]}40)`,
      }} />
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" style={{ filter: `drop-shadow(0 0 20px ${TIER_COLORS[tier]}60)` }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1a1f2e" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
          style={{
            stroke: TIER_COLORS[tier],
            strokeDasharray: c,
            strokeDashoffset: off,
            filter: `drop-shadow(0 0 15px ${TIER_COLORS[tier]})`,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-black" style={{ color: TIER_COLORS[tier] }}>{score}</span>
        <span className={`text-lg font-bold tracking-widest ${TIER_CLASS[tier]}`}>{tier}</span>
      </div>
    </div>
  );
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl p-6 hover:border-white/25 transition-all duration-500 hover:shadow-2xl ${className}`}
      style={{ boxShadow: '0 8px 32px rgba(0, 168, 224, 0.1)' }}>
      {children}
    </div>
  );
}

function AnimatedStat({ label, value, sub, icon }) {
  return (
    <GlassCard className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-vara/30 to-transparent rounded-bl-3xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
      <div className="relative z-10">
        <div className="text-xs uppercase tracking-widest text-gray-400 font-semibold">{label}</div>
        <div className="text-3xl font-black mt-2" style={{ background: 'linear-gradient(135deg, #00a8e0, #00d9ff)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          {value}
        </div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        {icon && <div className="text-2xl mt-2">{icon}</div>}
      </div>
    </GlassCard>
  );
}

function SimulatorSlider({ label, value, onChange, max = 20 }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <label className="text-sm font-bold tracking-wide">{label}</label>
        <span className="text-2xl font-black text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">{value}</span>
      </div>
      <input type="range" min="0" max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-vara transition-all hover:accent-cyan-400"
        style={{
          background: `linear-gradient(to right, #00a8e0 0%, #00a8e0 ${(value/max)*100}%, rgba(255,255,255,0.1) ${(value/max)*100}%, rgba(255,255,255,0.1) 100%)`,
        }} />
    </div>
  );
}

function ParticleNetwork() {
  return (
    <div className="relative h-72 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 p-8 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50%" cy="50%" r="80" fill="none" stroke="url(#grad1)" strokeWidth="2" opacity="0.3" />
        <circle cx="50%" cy="50%" r="120" fill="none" stroke="url(#grad2)" strokeWidth="1" opacity="0.2" />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00a8e0" />
            <stop offset="100%" stopColor="#00d9ff" />
          </linearGradient>
          <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00d9ff" />
            <stop offset="100%" stopColor="#00a8e0" />
          </linearGradient>
        </defs>
        {/* Network nodes */}
        <g filter="url(#glow)">
          <circle cx="20%" cy="50%" r="8" fill="#00a8e0" opacity="0.6" className="animate-pulse" />
          <circle cx="50%" cy="30%" r="10" fill="#00d9ff" opacity="0.7" />
          <circle cx="80%" cy="50%" r="8" fill="#00a8e0" opacity="0.6" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          <circle cx="50%" cy="70%" r="9" fill="#00d9ff" opacity="0.65" />
        </g>
        {/* Connection lines */}
        <line x1="50%" y1="50%" x2="20%" y2="50%" stroke="#00a8e0" strokeWidth="2" opacity="0.3" />
        <line x1="50%" y1="50%" x2="50%" y2="30%" stroke="#00d9ff" strokeWidth="2" opacity="0.3" />
        <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="#00a8e0" strokeWidth="2" opacity="0.3" />
        <line x1="50%" y1="50%" x2="50%" y2="70%" stroke="#00d9ff" strokeWidth="2" opacity="0.3" />
      </svg>
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center">
        <div className="text-5xl font-black mb-2">🌐</div>
        <h3 className="text-xl font-bold mb-1">Meta-Oracle Network</h3>
        <p className="text-sm text-gray-400">VaraVault aggregates trust signals from across the ecosystem</p>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, agent, score, tier, calls, vouchers }) {
  return (
    <tr className="hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-0 hover:shadow-lg hover:shadow-vara/20">
      <td className="px-6 py-4 font-black text-lg" style={{ color: TIER_COLORS[tier] }}>#{rank}</td>
      <td className="px-6 py-4 font-bold text-white">{agent}</td>
      <td className="px-6 py-4 text-right">
        <span className="font-black text-xl" style={{ color: TIER_COLORS[tier] }}>{score}</span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`px-3 py-1 rounded-full font-bold text-sm ${TIER_BG[tier]} ${TIER_CLASS[tier]}`}>
          {tier}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-gray-400 font-semibold">{calls}</td>
      <td className="px-6 py-4 text-right text-gray-400 font-semibold">{vouchers}</td>
    </tr>
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
  const [calls, setCalls] = useState(8);
  const [vouchCount, setVouchCount] = useState(5);
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
        const leader = await getLeaderboard(EXAMPLES.map(e => e.id));
        setLeaderboard(leader);
        setLeaderLoading(false);
      } catch (e) {
        setConn('error');
        setErr('Connection failed: ' + e.message);
        setLeaderLoading(false);
      }
    })();
  }, []);

  async function lookup(id) {
    const q = (id || target || '').trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(q)) { setErr('Enter a valid 0x… 64-char hex address'); return; }
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
    <div className="min-h-screen relative">
      <AnimatedGradientBg />

      {/* Header */}
      <header className="relative z-20 border-b border-white/10 sticky top-0 backdrop-blur-xl bg-[#0a0e14]/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-vara to-cyan-400 rounded-xl blur opacity-75" />
              <img src="/vault.svg" className="relative w-10 h-10 rounded-xl p-2 bg-[#0a0e14]" alt="VaraVault" />
            </div>
            <div>
              <div className="font-black text-lg leading-tight">VaraVault</div>
              <div className="text-[10px] text-gray-400 font-semibold">VARA Meta-Oracle</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
              conn === 'live' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${conn === 'live' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {conn === 'live' ? 'MAINNET LIVE' : 'OFFLINE'}
            </span>
            <a href="https://github.com/JMadhan1/varavault" target="_blank" rel="noreferrer"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-vara to-cyan-400 text-black hover:shadow-lg hover:shadow-vara/50 transition">GitHub</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block text-xs px-4 py-2 rounded-full bg-gradient-to-r from-vara/20 to-cyan-400/20 text-cyan-300 border border-cyan-400/30 mb-6 font-bold tracking-widest animate-pulse">
          ⚡ AGENTS ARENA S1 · TRACK 01 AGENT SERVICES ⚡
        </div>
        <h1 className="text-7xl md:text-8xl font-black leading-tight mt-6 mb-4" style={{
          background: 'linear-gradient(135deg, #00a8e0 0%, #00d9ff 50%, #00a8e0 100%)',
          backgroundSize: '200% 200%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          animation: 'gradient 3s ease infinite',
        }}>
          META-ORACLE
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mt-6 leading-relaxed font-semibold">
          Trust layer for the Vara agent economy. Every agent checks reputation before transacting.
          <br />
          <span className="text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">VaraVault aggregates signals from across the network.</span>
        </p>
        <code className="mt-8 inline-block text-[12px] text-gray-400 bg-black/50 px-4 py-2 rounded-lg border border-white/10 font-mono">{PROGRAM_ID}</code>
      </section>

      {/* Simulator Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Interactive Reputation Simulator
        </h2>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <GlassCard className="space-y-8">
            <div>
              <SimulatorSlider label="Calls Seen" value={calls} onChange={setCalls} max={30} />
            </div>
            <div>
              <SimulatorSlider label="Vouchers" value={vouchCount} onChange={setVouchCount} max={30} />
            </div>
            <div className="pt-6 border-t border-white/20">
              <div className="text-sm text-gray-400 mb-3 font-mono">Score = min(100, calls × 10 + vouchers × 15)</div>
              <div className="text-5xl font-black" style={{ color: TIER_COLORS[simTier] }}>
                {simScore}/100
              </div>
              <div className={`text-lg font-bold mt-2 ${TIER_CLASS[simTier]}`}>{simTier} Tier</div>
            </div>
          </GlassCard>
          <div className="flex justify-center items-center">
            <ScoreRing score={simScore} tier={simTier} />
          </div>
        </div>
      </section>

      {/* Lookup Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Look Up Any Agent
        </h2>
        <GlassCard>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
                placeholder="0x… agent address"
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-vara focus:ring-2 focus:ring-vara/30 transition-all"
              />
              <button onClick={() => lookup()} disabled={!ready || loading}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-vara to-cyan-400 text-black font-bold hover:shadow-2xl hover:shadow-vara/50 transition-all disabled:opacity-50 whitespace-nowrap">
                {loading ? '⏳ Querying...' : '🔍 Get Score'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.id} onClick={() => { setTarget(ex.id); lookup(ex.id); }}
                  className="text-xs px-4 py-2 rounded-full bg-white/5 hover:bg-vara/30 border border-white/10 hover:border-vara transition-all font-semibold">
                  {ex.label}
                </button>
              ))}
            </div>
            {err && <div className="text-sm text-red-400 font-semibold bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20">{err}</div>}

            {result && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="grid md:grid-cols-[auto,1fr] gap-8 items-start">
                  <ScoreRing score={result.score} tier={result.tier} />
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <AnimatedStat label="Tier" value={result.tier} icon={result.tier === 'Gold' ? '👑' : result.tier === 'Silver' ? '⭐' : '🥉'} />
                      <AnimatedStat label="Score" value={result.score} sub="/100" />
                      <AnimatedStat label="Calls Seen" value={result.callsSeen} sub="queries" />
                      <AnimatedStat label="Vouchers" value={result.voucherCount} sub="trust stakes" />
                    </div>
                    {vouchers.length > 0 && (
                      <GlassCard>
                        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">Vouched By ({vouchers.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {vouchers.slice(0, 8).map((v) => (
                            <code key={v} className="text-[10px] bg-black/50 px-2 py-1 rounded border border-white/10 font-mono">
                              {String(v).slice(0, 8)}…
                            </code>
                          ))}
                        </div>
                      </GlassCard>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* Leaderboard */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Live Rankings
        </h2>
        {leaderLoading ? (
          <GlassCard className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <div className="text-gray-400 font-semibold">Fetching on-chain leaderboard…</div>
          </GlassCard>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-vara/20 to-cyan-400/20 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest font-black text-gray-300">Rank</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest font-black text-gray-300">Agent</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-widest font-black text-gray-300">Score</th>
                  <th className="px-6 py-4 text-center text-xs uppercase tracking-widest font-black text-gray-300">Tier</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-widest font-black text-gray-300">Calls</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-widest font-black text-gray-300">Vouches</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((agent, i) => (
                  <LeaderboardRow key={agent.id} rank={i + 1} agent={agent.label} score={agent.score} tier={agent.tier} calls={agent.callsSeen} vouchers={agent.voucherCount} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Network Visualization */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Ecosystem Integration
        </h2>
        <ParticleNetwork />
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10 grid sm:grid-cols-3 gap-6">
        <AnimatedStat label="Query Fee" value={fee != null ? `${formatVara(fee)} VARA` : '—'} sub="per call" icon="💳" />
        <AnimatedStat label="Fees Accrued" value={accrued != null ? `${formatVara(accrued)} VARA` : '—'} sub="on-chain" icon="💰" />
        <AnimatedStat label="Network" value="Vara Mainnet" sub="live now" icon="🌐" />
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center border-t border-white/10">
        <h2 className="text-5xl font-black mb-4">Ready to Build Trust?</h2>
        <p className="text-gray-400 mb-8 text-lg">Integrate VaraVault into your agent. Query reputation. Vouch for trust. Earn VARA.</p>
        <div className="flex gap-4 justify-center">
          <a href="https://github.com/JMadhan1/varavault" target="_blank" rel="noreferrer"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-vara to-cyan-400 text-black font-bold hover:shadow-2xl hover:shadow-vara/50 transition-all">
            View Code on GitHub
          </a>
          <a href={`https://agents.vara.network/dashboard`} target="_blank" rel="noreferrer"
            className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 font-bold hover:border-vara hover:bg-vara/10 transition-all">
            See Live on Agents Arena
          </a>
        </div>
      </section>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 text-center border-t border-white/10 text-gray-500 text-sm">
        <div className="font-bold text-white mb-2">VaraVault 🏛️</div>
        <div>Because the agent economy runs on trust, and trust should be on-chain.</div>
        <div className="mt-2 text-xs">Built for Vara Agents Arena S1 · Operator <span className="text-vara font-bold">jmadhan</span></div>
      </footer>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
