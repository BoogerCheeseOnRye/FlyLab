# E200HA Handoff — run the entanglement fabric across 7 peers (5 phones + host census)

Goal: the e200ha (antiX 26) is the always-on **control node**. It plugs in 5 phones
(this tablet included) over **adb USB**, spawns one entanglement peer on each, meshes
them pairwise with the host census peers, derives a conference key, and tears
everything down. The stable deploy today is a live **7-peer full mesh (2 host census
+ 5 adb phones), each peer holding 6 links and every link KEY**. Proof was already
delivered live from this device: a real 2-peer fabric ran with both sides reporting
the **same** shared state — `node-0-tablet AS node-0-tablet-node-1-tablet  KEY  S=2.845  keyBits=336`,
peer-role A and B each holding matching Bell-CHSH and identical key material.

## Stable run on THIS box (2026-09-16) — 7 peers · K7 · 21 links · all KEY

The supervisor on the E200HA runs `peer-supervisor.mjs --devices all`, which adopts
every physically-attached phone plus the host census. Verified live with every peer
holding the **full 6-link mesh, every link KEY**:

| peer | model | serial (tail) | host status port | links | keyed |
|---:|---|---:|---:|---:|---:|
| node-0 | — (host census) | — | 20003 | 6 | 6 |
| node-1 | — (host census) | — | 20006 | 6 | 6 |
| dev-0 | REVVL_V__5G | 8778 | 22003 | 6 | 6 |
| dev-1 | TMRV08P5G | 3312 | 22006 | 6 | 6 |
| dev-2 | TMRV075G | 3946 | 22009 | 6 | 6 |
| dev-3 | TMRV06P5G (6x Pro) | 3908 | 22012 | 6 | 6 |
| dev-4 | SM_P613 (S6 Lite) | D2PJ | 22015 | 6 | 6 |

One-command bring-up (used for the desktop icons `~/Desktop/aarkanum*.desktop` →
`/home/user/.local/bin/aarkanum-secmesh-launch`):
```sh
bash /home/user/.local/bin/aarkanum-secmesh-launch   # adb → serve.js :8080 → supervisor → console
```

## The pipeline (don't invent around it)

- `secsim-core.mjs` is **generated** from `app/crosslab/physics_simulator.html` via
  `node node-tests/sync-seccore.mjs` — never hand-edit it, edit the HTML then re-sync.
- The Security Console module is re-extracted from `app/crosslab/security_defender.html` —
  after edits: re-extract to a scratch file and `node --check` it.
- Gate before shipping any change: `node selfcheck.mjs` → `SELFCHECK-OK: 20/20 green`
  (2026-09-16: the qkd gate now runs on a dedicated sandbox port base 2600x —
  `qkd-cluster --self` defaults to the census base 20001 whose sta=ent+2000 lands
  on the live 2200x device family; it must never run against the always-on fabric.
  The stealth-Eve parked-leak probe uses N=20000 so the `corr > 0.05` lane is
  ~5σ stable, not a ~2σ flake). Added probes: `tls-hybrid.mjs` — PQ-hybrid TLS gate,
  X25519MLKEM768 negotiable + AEAD/PFS-only floor; `sweep-novel.mjs` — 3 unseen novel
  attack shapes repelled by behavior, not signature; plus `agent-pen.mjs` extended to
  52/52 with honeytoken decoy + signed-control phases E/F.
- Docs rule: the cluster is **N peers, n(n−1)/2 links** — nothing is fixed at four.
- Package for the device Downloads folder: `cd <repo> && node make-backup.mjs`
  (writes `app/backups/aarkanum-*.tar.gz` **and** `$HOME/storage/downloads/`).
  A copy of this skill lives on this device at `~/.config/opencode/skills/aarkanum-download/`.

## First boot on the e200ha (25-30 min)

```sh
# 1. deps (antiX uses apt)
sudo apt update && sudo apt install -y adb git  # node from nodejs.org LTS tarball if apt is old
node --version                                   # want >= 18; qkd-cluster needs modern node

# 2. get the code (tarball from Downloads is fine — it IS the whole repo)
tar -xzf aarkanum-*.tar.gz
cd aarkanum-labs*

# 3. adb trust: plug the 4 phones in, enable Developer Options + USB debugging on each
adb devices          # expect 4 lines ending in "device" (approve the RSA prompt per phone)
```

## Latest proof run — 5-node mesh (10 links, conference key)

```json
{
  "rounds": 4000,
  "nodes": 5,
  "links": [
    { "link": "node-0-node-1", "chsh": 2.789, "verdict": "KEY", "keyBits": 441 },
    { "link": "node-0-node-2", "chsh": 2.780, "verdict": "KEY", "keyBits": 456 },
    { "link": "node-0-node-3", "chsh": 2.683, "verdict": "KEY", "keyBits": 426 },
    { "link": "node-0-node-4", "chsh": 2.823, "verdict": "KEY", "keyBits": 453 },
    { "link": "node-1-node-2", "chsh": 2.932, "verdict": "KEY", "keyBits": 444 },
    { "link": "node-1-node-3", "chsh": 2.827, "verdict": "KEY", "keyBits": 447 },
    { "link": "node-1-node-4", "chsh": 2.779, "verdict": "KEY", "keyBits": 420 },
    { "link": "node-2-node-3", "chsh": 2.684, "verdict": "KEY", "keyBits": 447 },
    { "link": "node-2-node-4", "chsh": 2.816, "verdict": "KEY", "keyBits": 453 },
    { "link": "node-3-node-4", "chsh": 2.830, "verdict": "KEY", "keyBits": 417 }
  ],
  "conferenceKey": "c8fd0e85...3eba22",
  "gate": { "ok": true, "honOk": true, "eveOk": true }
}
```

All 10 links KEY, honest S̄ = 2.79–2.93 (all > 2), 417–456 bits per link, conference key derived from honest keys only. Full result in `qkd-run.json`.

## Drive the whole fabric

```sh
# every attached phone joins, meshes (n(n-1)/2 links), one conference key, then auto-teardown:
node node-tests/qkd-cluster.mjs --adb all --dir "$PWD" --rounds 6000 --out qkd-run.json

# deeper proof on a bench (8 spawn peers → 28 links → one key; no hardware needed):
node node-tests/qkd-cluster.mjs --self --nodes 8 --rounds 4000

# LAN/wifi route for this tablet or any phone without adb:
node node-tests/entangle-peer.mjs --name node-0 --entangle 7200 --control 7300 --status 7301   # on that device
node node-tests/qkd-cluster.mjs --peers node-0=192.168.…:7200 --rounds 6000
```

## Port families

**Host supervisor / console default — the census family** (what `peer-supervisor.mjs`,
`bringup_census.mjs` and the security console use): node *i* on `127.0.0.1` holds
entangle `20001+3i` · control `20002+3i` · status `20003+3i`. So nodes 0–4 are
`20001/02/03`, `20004/05/06`, `20007/08/09`, `20010/11/12`, `20013/14/15`, and the
console's **mesh** box defaults to the five status ports `20003, 20006, 20009,
20012, 20015`. The tier-1 supervisor's `--peers` default is exactly this string.

**Phones over adb — two launchers, same host forwards, one critical gotcha:**

- **`qkd-cluster.mjs --adb` (one-shot coordinator):** peer *i* runs device-side
  ent `7200+10i` / ctl `7300+10i` / sta `7400+10i`, forwarded to host
  `22001+3i / +1 / +2`.
- **`peer-supervisor.mjs --devices all` (persistent watchdog, what the console uses):**
  device-side ent `7200+10i` / **ctl `8200+10i` / sta `9200+10i`** (NOT +1000/+2000 —
  the supervisor's `initDevices` sets them explicitly), forwarded to the same host
  `22001+3i / +1 / +2`. Names are `dev-0..dev-4` (NOT node-N) so they never collide
  with the host census in the console mesh renderer.

| device (si) | peer | device ports ent/ctl/sta (supervisor) | forwarded to 127.0.0.1 |
|---:|---|---|---|
| phone 0 | dev-0 | 7200 / 8200 / 9200  | 22001 / 22002 / 22003 |
| phone 1 | dev-1 | 7210 / 8210 / 9210  | 22004 / 22005 / 22006 |
| phone 2 | dev-2 | 7220 / 8220 / 9220  | 22007 / 22008 / 22009 |
| phone 3 (6x Pro) | dev-3 | 7230 / 8230 / 9230  | 22010 / 22011 / 22012 |
| tablet (S6 Lite) | dev-4 | 7240 / 8240 / 9240  | 22013 / 22014 / 22015 |

**CRITICAL adb-reverse gotcha (2026-09-16):** a *phone-initiated* dial targets
`127.0.0.1:<host-ent>` on the phone — that address only exists because of
`adb reverse tcp:<ent> tcp:<ent>` on that phone (mapping its own loopback port back
to the host, which forwards onward). Without reverse routes, phones can receive
dials (host → forward) but their own outbound dials get ECONNREFUSED → the seed
exits 1 (`qkd-cluster: control closed`) and phone peers sit at 0 links while host
peers look fine. The supervisor's `reverseDevice()` adds every live 2000x + 2200x
ent port per phone on spawn **and** on adopt; `qkd-cluster.mjs` does the same for
the local ents it spawns.

**Seed control-port gotcha (2026-09-16):** `qkd-cluster.mjs` `parsePeers` defaults
`ctl = ent + 1000`, but BOTH host census (2000x) and phone family (2200x) run
control = ent + 1. The supervisor's `seedRound` always passes explicit
`name=127.0.0.1:<ent>:<ctl>` for pairs and devices — never rely on the +1000
default for these families or the coordinator dials the wrong control and the mesh
stays unkeyed (the console shows `⚠ keyless`).

To watch an adb mesh in the console, set the **mesh** field to
`http://127.0.0.1:22003/e91,http://127.0.0.1:22006/e91,…` (the forwarded status ports;
the console's `autoMeshForDevices` adds the live device status URLs automatically).

## Troubleshooting

- `adb devices` shows `unauthorized`: approve the RSA debug prompt on that phone's screen.
- `--adb all` says no attached serials: check cable/state first (`adb devices`), phones must
  report `device` (not `offline`/`emulator-*`).
- A peer's control never answers: if you hand-spawned it at a non-default control port, tell
  the coordinator: `--peers node-0=host:7200:8300`.
- Want to inspect a mesh live: add `--keep` (leaves peers up), then read each peer's telemetry
  at its status port, e.g. `curl http://127.0.0.1:22003/e91`. Each link line shows
  `link · role · peer · n · eve · chsh · verdict · keyBits · key` — honest links hold
  `chsh ≈ 2.83 > 2`, an Eve-injected link collapses to `≈ 0.6` and aborts.
- first dial refused after `--keep` runs: the node died on teardown of the previous non-keep
  run; just re-run `--adb all` (it re-spawns).
- Killing stale peers: kill by exact PID/name (`pkill -f` can match your own shell).

## Watchdog tiers (keep the fabric alive when nobody is watching)

One `parent-watchdog.mjs` keeps the whole mesh console stack up on the host:

- **tier-1 · peer-supervisor** — `node node-tests/peer-supervisor.mjs`
  owns the entangle-peer processes (adopts any it finds, NUL-safe `/proc` argv match):
  health-checks every `/e91` every ~3 s and auto-restarts a dead peer after 2
  strikes (boot-grace 6 s). Manual `stop` is honored (peer held stopped) until an
  explicit `start`/`reboot`/`recover`. Device-aware autonomy, all live-tested:
  - **device stats** — every tick samples `/proc/meminfo`, loadavg and per-peer RSS.
  - **adaptive seed** — a keyless-but-alive mesh re-seeds itself after 60 s at
    `adaptiveRounds()`: rounds shrink ×0.6 < 700 MB free, ×0.4 < 500 MB, or when
    load saturates cores. Explicit Recover/deploy numbers are never overridden.
  - **autonomous scale** — grows +1 peer after 3 good ticks / retires after 12
    pressured ticks; capacity = min(memory-runnable, cores/2), floor = last manual
    deploy count; quiet 30 s after every seed. Toggle with `auto&on=0|1`.
  - **RSS leak guard + quarantine** — a peer over `--rss-hard` MB (>380) is
    rebooted once, quarantined on a second overrun; restart-thrash (5 bounces in a
    minute) is quarantined (`--quarantine-ms`, default 600 000 = 10 min) so the
    watchdog stops fighting it. Restart/recover/deploy lifts it.
  - **rotating log** — console + `app/logs/supervisor.log` (1 MB cap, one backup)
    + `status.supLog` ring; the UI's `logs` link reads `action=log`.
- **console tier-3 · 3D preview autonomy** — `security_defender.html`
  (no new daemons, pure browser):
  - **auto-focus** — after the autonomous layers get ~12 s to repel, the camera
    drifts to nodes still under sustained attack (⛨ badge on the stage; drag/pinch
    breaks it, focus re-asserts only while the attack keeps firing). Engine
    quarantine doesn't grab the camera — the intervention popup handles it.
  - **intervention popup** — a peer the watchdog quarantined (or a node the mesh
    auto-isolated) raises `#quarPanel` with the node info + suggestions: reboot
    the peer / recover the fabric / wait for auto-release. Operator-initiated
    quarantines never pop (suppressed 5 s via `quarOperatorAt`); dismissing the
    popup never cancels the quarantine.
- **tier-2 · parent watchdog** — `node node-tests/parent-watchdog.mjs`
  (one daemon, `--web 8081,8080`): if the supervisor dies it re-spawns it; if
  serve.js dies it re-spawns it; it watches the supervisor's own RSS and reboots
  a leaking tier-1 (> `--sup-rss-hard` MB, boot-grace 30 s); if the whole fabric
  is dead > 60 s it calls recover on the supervisor, throttled to 5 min — but it
  *defers* while the supervisor has quarantined peers. Own rotating log
  `app/logs/parent.log`, device-stats heartbeat every minute.

```bash
nohup node node-tests/parent-watchdog.mjs --web 8081,8080 >/dev/null 2>&1 &
# from the e200ha we add:  qkd-cluster.mjs --adb all --dir "$PWD" for the USB phone mesh
```

Control HTTP (proxy the browser hits via `serve.js` → `/peerctl`):

```
GET /?action=status                 pairs (up/strikes/restarts/stopped/rssMB/quarantined),
                                    stats (mem% · availMB · load · cores), autoCap, quarantines, supLog ring
GET /?action=auto&on=0|1            toggle autonomous scaling
GET /?action=log&n=N                last N supervisor log lines
GET /?action=wd&on=0|1              toggle tier-1 auto-restart
GET /?action=start|stop|restart&name=all|node-X
GET /?action=seed&rounds=N          re-key the whole mesh at N rounds (--keep)
GET /?action=recover&rounds=N       stop all → start all → seed
GET /?action=deploy&nodes=N[&seed=0]  grow/shrink peers (sets the auto-scale floor) + seed
```

On the host where *this aarkanum* runs, the UI row `⏱ ⚡ ⏻ ⟳ 🔁` under the
entanglement fabric uses exactly these (Watchdog · Start · Stop · Reboot ·
Recover), and `⟑ Deploy N` + `⚙` (hardware scan) sit right under it. Verified live
on the tablet host: kill a peer by hand → supervisor auto-reboots it in seconds;
`recover` re-keys 2 nodes · 1 link · conference key in ~8 s; kill all + `start` →
60 s later the supervisor auto-seeded 3000 rounds (5000 × 0.6 on 546 MB free) and
restored `node-0-node-1/KEY`; deploy 3 built a full triangle, shrink closed the
third peer.

## Beyond brute force — the two adversarial suites

Both probes are hermetic (sandbox ports, `SUP_LOG_DIR` logs, exact-PID teardown with a
bind-check proof) — they never touch the live 22k/808x stack and leave nothing running
when they exit. They're part of `node selfcheck.mjs`.

- **stealth-Eve leak probe** (`qkd-selfcheck.mjs`) — a Bell-compliant attacker a human
  eyeballing CHSH would miss. Model: `S = 2√2·(1−2η)`, so an Eve parking ~5.6% key-cell
  corruption at `η* ≈ 0.058` still lands `S ≈ 2.47` → verdict **KEY** while the sifted
  key diverges. A side-channel `aligned` Eve (z-basis-only disturbance — the
  detector-blinding/gate-window family) keeps `S ≈ 2.89` (Bell-blind) yet corrupts
  17–23% of the key cells. Lesson: CHSH alone cannot certify the key — watch the
  key-divergence margin, not the S score.
- **agent-pen bench** (`node node-tests/agent-pen.mjs`) — throws four hostile classes at
  a sandboxed tier-1 supervisor, 34/34 invariants held:
  - **A rogue impostor** on a foreign port claiming to be a peer → no adoption, identity
    stays port-bound, pid preserved, no quarantine.
  - **B control-API abuse** → unknown actions 400; `auto&on=`/`wd&on=` only parse exact
    `0|1`; `log&n=999999` clamps to the ring; no phantom deploys.
  - **C `/e91` quantum-fuzz** → malformed JSON, 10 000-link bodies, forged
    `quarantined`/`rssMB`/`__proto__`, near-2 MB payloads; peer stays up, view stays clean.
  - **D forged telemetry** → RSS is kernel-fed from `/proc` (`rssMB:999999` ignored); no
    durable false state gets planted.
- **known gap (documented, not fixed)** — a full *replacement* of a pair's own status
  port with a healthy-looking liar still fools the `up` signal: the tier-1 health check
  trusts the HTTP response. The bench prints this note every run; the fix is left as a
  follow-up (e.g. bond the status port to the entangle socket the supervisor itself
  dialed).

## Handing back to opencode on the e200ha

Open a session in the repo and you can say things like:

- "run the cluster across all 5 devices" → `node node-tests/qkd-cluster.mjs --adb all --dir "$PWD"`
- "show me the gates" → `node selfcheck.mjs` (must stay 20/20 before any ship)
- "package a fresh copy to Downloads" → `node make-backup.mjs`
- "add a device" → plug it in; `--adb all` re-lists it; nothing else to change
- "make the docs honest" → remember: N-peer language, `n(n−1)/2` links, `--adb all` flow,
  living-nodes proof (KEY + matching keyBits), `--keep` for live inspection.