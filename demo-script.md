# VaraVault Demo Video Script (2.5–3 Minutes)

**Goal:** Convince judges that VaraVault is the most important infrastructure in the arena — not a toy, but a production-grade oracle every agent needs.

---

## [0:00–0:15] Hook — The Problem

**Screen:** Show the VaraVault homepage hero section. The big "VARAVAULT" title, the animated gradient background, the tagline.

**Say:**
> "The Vara Agents Arena has a trust problem. Hundreds of autonomous agents are launching — but how does any agent know which other agents to trust before transacting? Right now, they don't. They transact blindly. That's a recipe for spam, sybils, and wasted gas."

**Why this matters:** Judges need to feel the problem before they value your solution. You're defining the problem space and claiming it.

---

## [0:15–0:35] The Solution — What VaraVault Is

**Screen:** Scroll down to the "What VaraVault Does" section with the three glass cards (Query Reputation, Vouch for Trust, Earn Revenue).

**Say:**
> "VaraVault is the answer. It's an on-chain reputation oracle — live on Vara Mainnet right now. Any agent can query any other agent's trust score, get a deterministic 0-to-100 rating with a Bronze, Silver, or Gold tier. Agents can stake VARA to vouch for agents they trust. And every paid call captures fees in the contract itself — so the oracle is self-funding, not a cost center."

**Why this matters:** You're positioning VaraVault as infrastructure, not a demo. The economic sustainability angle is a huge differentiator.

---

## [0:35–1:05] The Simulator — Interactive Demo (No Wallet Needed)

**Screen:** Scroll to the "Try the Simulator" section. Drag the "Calls Seen" slider from 0 to 15. Drag the "Vouchers" slider from 0 to 8. Watch the score update from 0 to 100 and the ring animate through Bronze → Silver → Gold.

**Say:**
> "Here's the best part — you can try it right now without a wallet. This simulator shows exactly how reputation is calculated. Calls Seen represents how many times other agents have queried an agent's score — that's demand. Vouchers represent how many wallets have staked VARA to vouch for that agent — that's trust."

**Action:** Drag Calls to 8, Vouchers to 5.

> "At 8 calls and 5 vouchers, the score is... 95. Gold tier. Now watch what happens if an agent has no demand but lots of vouchers."

**Action:** Drag Calls to 0, keep Vouchers at 5.

> "75 — still Gold, but lower. The formula weights vouchers more heavily because staking real VARA is a stronger signal than just being queried. Now try the opposite — high demand, no trust."

**Action:** Drag Calls to 10, Vouchers to 0.

> "100, but only Silver tier. Because without anyone willing to stake VARA on you, you're not truly trusted. The formula is transparent: score equals minimum of 100, calls times 10 plus vouchers times 15. Same rule for every agent. No black box. No off-chain ML. Verifiable by anyone."

**Why this matters:** The simulator is VaraVault's equivalent of Dirac's in-browser game — but yours teaches real utility. Judges will remember the interactive demo.

---

## [1:05–1:30] Live On-Chain Score — Real Mainnet Data

**Screen:** Scroll to the "Look Up VaraVault's Live Score" section. Click "Check VaraVault's Own Score" button. Wait for the query. Show the ScoreRing animating, then the stats grid appearing.

**Say:**
> "This isn't a mockup. Let me show you VaraVault's actual score on mainnet right now."

**Action:** Click the button. Wait for load.

> "Tier: [read the tier]. Score: [read the score] out of 100. Calls seen: [read the number] — that's real agents querying this oracle. Vouchers: [read the number] — real wallets that staked VARA to vouch for VaraVault. And these are all on-chain, verifiable, permanent."

**Why this matters:** Real mainnet data beats any localnet prototype. You're proving this is live and working.

---

## [1:30–1:55] The Scoring Formula — Transparency

**Screen:** Scroll to "How the Scoring Works" section. Show the code block and the explanation.

**Say:**
> "Let me break down why this scoring model wins. Every input is on-chain and verifiable. Calls Seen is a proxy for relevance — the more agents query you, the more relevant you are. Vouchers is a proxy for trust — the more wallets stake VARA on you, the more trustworthy you are. And because the formula is public and deterministic, any judge, any developer, any agent can independently reproduce any score. There is no opaque algorithm. No trusted backend. No single point of failure."

**Why this matters:** Transparency and verifiability are core blockchain values. You're hitting those notes hard.

---

## [1:55–2:15] Protocol Stats — Economic Sustainability

**Screen:** Scroll to the stats row at the bottom (Query Fee, Fees Accrued, Network).

**Say:**
> "And here's what separates VaraVault from every toy demo in this hackathon: it has real economics. Every QueryScore call costs 1 VARA. Every Vouch costs 1 VARA. That VARA goes into the contract. The owner can withdraw accumulated fees. So the oracle isn't burning gas for free — it's capturing value. It's sustainable. It can run forever without grants or subsidies."

**Why this matters:** Economic sustainability is rare in hackathon projects. This is a massive differentiator.

---

## [2:15–2:35] Why VaraVault Should Win — The Pitch

**Screen:** Scroll back to the top. Show the hero, the program ID, the GitHub link.

**Say:**
> "VaraVault isn't competing with other agents — it enables all of them. Every agent that joins the arena needs to know who to trust. Every transaction between agents needs a trust check. Every staking decision needs reputation data. The more the arena grows, the more valuable VaraVault becomes. It's horizontal infrastructure. A primitive, not a product."

**Pause.**

> "Live on Vara Mainnet. Deterministic scoring. Real VARA economics. A working demo you can try right now at varavault.vercel.app. That's VaraVault."

**Why this matters:** You're closing with the "horizontal infrastructure" argument — the most powerful frame for winning a hackathon. Judges want to fund primitives that unlock an ecosystem.

---

## [2:35–2:45] Outro — Call to Action

**Screen:** Show the footer with the program ID and links.

**Say:**
> "Check the code on GitHub. Query the contract at program ID zero-x-e842...622ba3. And build on VaraVault — because the agent economy runs on trust, and trust should be on-chain."

---

## Technical Recording Tips

1. **Use a clean browser** — no bookmarks bar, no extensions showing, full-screen the demo
2. **Mouse highlight** — use a tool like Presentify or Cursor Pro so judges can follow your cursor
3. **Speak slowly** — 2.5 minutes is plenty of time. Don't rush the simulator section
4. **Show the connection status** — point out the "MAINNET LIVE" badge in the header
5. **Show real data loading** — don't skip the loading states. Real on-chain queries take a moment, and that authenticity sells it
6. **End with the program ID visible** — judges will want to verify it themselves

## Optional Bonus Segments (if you have extra time)

### Bonus A: GitHub Code Walkthrough (15s)
> "The contract is built with Sails on Gear 1.10, compiled to optimized WASM, and deployed with a reproducible Docker build. Three services — Reputation, Voucher, Admin — one shared state. Minimal surface, maximal composability."

### Bonus B: Heartbeat Agent (10s)
> "An autonomous heartbeat agent keeps the protocol active 24/7 — posting Board announcements, broadcasting Chat messages, and keeping on-chain metrics moving even while I sleep."

### Bonus C: Board Post (10s)
> "You can find VaraVault's launch announcement on the Agents Arena Board right now. Live social proof, on-chain, permanent."

---

## Program ID to Display
`0xe84273e438a103fc4eda639ec9b96b3f9bff5470909735ca11484e0aff622ba3`

## Demo URL to Mention
`https://varavault.vercel.app`

## GitHub URL to Mention
`https://github.com/JMadhan1/varavault`
