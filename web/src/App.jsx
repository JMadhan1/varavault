import { useEffect, useState } from 'react';
import {
  initVault, getScore, getFee, getAccumulatedFees, getVouchers,
  formatVara, PROGRAM_ID,
} from './vault.js';

const TIER_COLORS = { Bronze: '#d4a574', Silver: '#a8b5c4', Gold: '#ffd700' };
const TIER_CLASS = { Bronze: 'text-[#d4a574]', Silver: 'text-[#a8b5c4]', Gold: 'text-yellow-300' };

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

  useEffect(() => {
    (async () => {
      try {
        await initVault();
        setConn('live');
        setReady(true);
        setFee(await getFee());
        setAccrued(await getAccumulatedFees());
        await lookup(PROGRAM_ID);
      } catch (e) {
        setConn('error');
        setErr('Connection failed: ' + e.message);
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
              <div className="text-[10px] text-gray-400 font-semibold">Trust Layer for Vara</div>
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
          VARAVAULT
        </h1>
        <p className="text-2xl text-gray-300 max-w-3xl mx-auto mt-6 leading-relaxed font-bold">
          The on-chain reputation oracle for agents on Vara Mainnet.
        </p>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto mt-3">
          Before any agent transacts with another, they check VaraVault. One query. Deterministic score. Zero trust assumptions.
        </p>
        <code className="mt-8 inline-block text-[12px] text-gray-400 bg-black/50 px-4 py-2 rounded-lg border border-white/10 font-mono">{PROGRAM_ID}</code>
      </section>

      {/* What VaraVault Does */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          What VaraVault Does
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-2">Query Reputation</h3>
            <p className="text-gray-400 text-sm">Call QueryScore with any agent address. Get a 0-100 score + tier (Bronze/Silver/Gold) in real-time. Costs 1 VARA.</p>
          </GlassCard>
          <GlassCard>
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="text-xl font-bold mb-2">Vouch for Trust</h3>
            <p className="text-gray-400 text-sm">Stake 1 VARA to vouch for an agent you trust. Your vouches directly feed into their reputation score.</p>
          </GlassCard>
          <GlassCard>
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-xl font-bold mb-2">Earn Revenue</h3>
            <p className="text-gray-400 text-sm">Every paid query and vouch generates fees. The contract captures revenue. Sustainable oracle design.</p>
          </GlassCard>
        </div>
      </section>

      {/* Simulator Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Try the Simulator (No Wallet Needed)
        </h2>
        <p className="text-gray-400 mb-8 max-w-2xl">Drag the sliders to see how reputation scores are calculated. Every agent's score is based on calls seen + vouchers staked.</p>
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
              <div className="text-xs text-gray-500 mt-3">
                {simTier === 'Gold' && '⭐ Highest trust tier'}
                {simTier === 'Silver' && '✨ Mid-tier trust'}
                {simTier === 'Bronze' && '🥉 Entry-level reputation'}
              </div>
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
          Look Up VaraVault's Live Score
        </h2>
        <p className="text-gray-400 mb-8">VaraVault's reputation on mainnet. Built by real agent queries and vouches.</p>
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
            <button onClick={() => lookup(PROGRAM_ID)}
              className="text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-vara/20 border border-white/10 hover:border-vara transition-all font-semibold">
              📍 Check VaraVault's Own Score
            </button>
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

      {/* How It Works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          How the Scoring Works
        </h2>
        <GlassCard>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Deterministic Reputation</h3>
              <p className="text-gray-400 mb-4">Every agent's score is calculated the same way, on-chain, verifiable by anyone:</p>
              <code className="block bg-black/50 px-4 py-3 rounded-lg text-sm text-cyan-300 font-mono border border-white/10 overflow-x-auto">
                score = min(100, calls_seen × 10 + voucher_count × 15)
              </code>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-2">📊 Calls Seen</h4>
                <p className="text-gray-400 text-sm">How many times other agents have queried this agent's reputation. A proxy for relevance and demand.</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">🤝 Vouchers</h4>
                <p className="text-gray-400 text-sm">How many wallets have staked VARA to vouch for this agent. A proxy for trust.</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10 grid sm:grid-cols-3 gap-6">
        <AnimatedStat label="Query Fee" value={fee != null ? `${(Number(fee) / 1e12).toFixed(2)} VARA` : '—'} sub="per call" icon="💳" />
        <AnimatedStat label="Fees Accrued" value={accrued != null ? `${(Number(accrued) / 1e12).toFixed(2)} VARA` : '—'} sub="on-chain" icon="💰" />
        <AnimatedStat label="Network" value="Vara Mainnet" sub="live now" icon="🌐" />
      </section>

      {/* Ecosystem Integration */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-4xl font-black mb-10 text-transparent bg-gradient-to-r from-vara to-cyan-400 bg-clip-text">
          Ecosystem Integrations
        </h2>
        <p className="text-gray-400 mb-8">VaraVault feeds reputation signals across the Vara network. Every agent that makes a trade, loan, or prediction needs trust data.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard>
            <div className="flex gap-4 items-start">
              <div className="text-3xl">🌉</div>
              <div>
                <h3 className="font-bold text-lg mb-1">@varabridge</h3>
                <p className="text-gray-400 text-sm mb-3">Market data oracle. Before quoting prices, queries VaraVault to vet the counterparty's trust score.</p>
                <div className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10 inline-block font-mono">QueryScore → verify agent</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex gap-4 items-start">
              <div className="text-3xl">📊</div>
              <div>
                <h3 className="font-bold text-lg mb-1">@sentinel-analytics</h3>
                <p className="text-gray-400 text-sm mb-3">Credit scoring service. Feeds VaraVault reputation into on-chain risk models for agent lending.</p>
                <div className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10 inline-block font-mono">Reputation → credit risk</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex gap-4 items-start">
              <div className="text-3xl">📈</div>
              <div>
                <h3 className="font-bold text-lg mb-1">@a2a-radar</h3>
                <p className="text-gray-400 text-sm mb-3">Discovery signals. Uses VaraVault scores to recommend trustworthy agents to premium subscribers.</p>
                <div className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10 inline-block font-mono">Trust tier → signals</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex gap-4 items-start">
              <div className="text-3xl">🎰</div>
              <div>
                <h3 className="font-bold text-lg mb-1">@hy4-predict</h3>
                <p className="text-gray-400 text-sm mb-3">Prediction markets. Weights agent outcomes by their VaraVault reputation tier.</p>
                <div className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10 inline-block font-mono">Score tier → odds weight</div>
              </div>
            </div>
          </GlassCard>
        </div>
        <div className="mt-8 p-4 rounded-xl bg-vara/10 border border-vara/30">
          <p className="text-sm text-gray-300"><span className="font-bold text-vara">Key insight:</span> VaraVault is not an isolated service. Every outgoing call to other agents, every integration with discovery, credit, or market services, makes the oracle more valuable. The more the ecosystem grows, the more agents need to know who to trust.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center border-t border-white/10">
        <h2 className="text-5xl font-black mb-4">Ready to Build Trust?</h2>
        <p className="text-gray-400 mb-8 text-lg">Integrate VaraVault into your agent. Query reputation. Vouch for trust. Build on Vara.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="https://github.com/JMadhan1/varavault" target="_blank" rel="noreferrer"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-vara to-cyan-400 text-black font-bold hover:shadow-2xl hover:shadow-vara/50 transition-all">
            View Code on GitHub
          </a>
          <a href="https://agents.vara.network" target="_blank" rel="noreferrer"
            className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 font-bold hover:border-vara hover:bg-vara/10 transition-all">
            See on Agents Arena
          </a>
        </div>
      </section>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 text-center border-t border-white/10 text-gray-500 text-sm">
        <div className="font-bold text-white mb-2">VaraVault 🏛️</div>
        <div>Reputation oracle for the Vara agent economy.</div>
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
