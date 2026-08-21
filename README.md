<p align="center">
  <img src="icon.svg" alt="Bitcoin Knots Logo" width="21%">
</p>

# Bitcoin Knots (RDTS) on StartOS

> Everything not listed in this document should behave the same as upstream
> Bitcoin Knots. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Bitcoin Knots](https://github.com/bitcoinknots/bitcoin) is a derivative of Bitcoin Core with a larger set of policy controls and a built-in wallet surface. **This flavor follows the RDTS chain** — a separate blockchain from the one Bitcoin Core and Bitcoin Knots (pre-RDTS) follow. Read [RDTS Chain Opt-In](#actions) before installing it. Like the other bitcoind flavors it runs with an embedded I2P router beside it and, when pruned, a block-fetching RPC proxy in front.

- **Upstream repo:** <https://github.com/bitcoinknots/bitcoin>
- **Wrapper repo:** <https://github.com/Start9Labs/bitcoin-knots-startos/tree/29.x>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The node binary does not come from a registry. The repo's own `Dockerfile` downloads the upstream release tarball from `bitcoinknots.org`, verifies it, and copies `bitcoind` and `bitcoin-cli` onto a slim Debian base. Three registry images run alongside it.

| Property      | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Image         | Built from `Dockerfile` — upstream release binaries on `debian:stable-slim` |
| Architectures | x86_64, aarch64, riscv64                                                    |
| Entrypoint    | `bitcoind`                                                                  |

Verification is a signer quorum rather than a single trusted key: `SHA256SUMS.asc` must carry good signatures from a quorum of **distinct** signers holding keys committed under `assets/release-keys/`, counted by primary fingerprint so that one signer's subkeys cannot vote twice, and the keyring is asserted equal to the pinned set so a stray key cannot join the count. Only then is the tarball checked against `SHA256SUMS`. The runtime image adds `curl` (the snapshot download shells out to it), `jq`, `yq`, `tini`, and `e2fsprogs`.

| Subcontainer   | Image                   | Lifetime                 | Purpose                                                                                                                                                                                                                                    |
| -------------- | ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bitcoind-sub` | built locally           | the running service      | The `bitcoind` daemon — this is the one to `attach` to                                                                                                                                                                                     |
| `i2pd-sub`     | `purplei2p/i2pd`        | while I2P is enabled     | Embedded I2P router: SAM bridge, SOCKS proxy, I2PControl                                                                                                                                                                                   |
| `proxy-sub`    | `btc-rpc-proxy`         | while the node is pruned | Serves RPC on 8332 and fetches pruned blocks over p2p                                                                                                                                                                                      |
| _temporaries_  | built locally, `python` | seconds to hours         | One per action that shells out — `assumeutxo`, `delete-peers`, `delete-txindex`, `delete-coinstats`, `getnetworkinfo`, `getblockchaininfo`, every Wallet-group action, and `rpc-auth-generator` (the `python` image, running `rpcauth.py`) |

Three oneshots bracket the daemons. `nocow` sets the btrfs no-COW attribute across the data directory and must finish before `bitcoind` starts. `synced-true` and `chain-recovery` run after it, and are described under [Installation and First-Run Flow](#installation-and-first-run-flow).

The i2pd image has no riscv64 build and is declared `emulateMissingAs: 'x86_64'`, so on riscv64 hardware the I2P router runs emulated.

## Volume and Data Layout

Two volumes. Everything the node writes lives in one; the embedded I2P router keeps its own.

| Volume | Mount Point      | Purpose                                                                                                                                       |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `main` | `/root/.bitcoin` | The bitcoind data directory — `bitcoin.conf`, `blocks/`, `chainstate/`, `indexes/`, wallets, `peers.dat`, the RPC `.cookie`, and `store.json` |
| `i2pd` | `/home/i2pd`     | i2pd's data directory — `data/i2pd.conf`, the router identity, and its netDb                                                                  |

`store.json` sits inside the bitcoind data directory rather than on a volume of its own; it holds StartOS-side state, not upstream configuration. The Download UTXO Snapshot action additionally mounts the `main` volume's `tmp` subdirectory at `/tmp` inside its own subcontainer, so a part-downloaded snapshot occupies the data volume rather than container storage.

## File Models

Three models, and ownership is decided per key rather than per file: some keys are enforced on every write, some are seeded once and then yours, and one is derived from the addresses StartOS has published.

| File                          | Format | Modelled                | Written by                                                                                                      |
| ----------------------------- | ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/root/.bitcoin/bitcoin.conf` | INI    | Yes — `FileHelper.ini`  | Install, every init, the four config actions, the RPC-user actions, `watchHosts`, and the `synced-true` oneshot |
| `/root/.bitcoin/store.json`   | JSON   | Yes — `FileHelper.json` | Install, every init, `main`, and several actions                                                                |
| `/home/i2pd/data/i2pd.conf`   | INI    | Yes — `FileHelper.ini`  | Init only                                                                                                       |

**A key the package does not model is left alone.** Both INI models parse loosely, so a setting you add by hand that the schema does not declare rides through every rewrite untouched. Everything below concerns the keys the package _does_ declare.

### bitcoin.conf

**Enforced** — rewritten to a fixed value whenever the package writes the file: `rpcbind`, `rpcallowip`, `rpccookiefile`, `listen`, `whitebind`, and `deprecatedrpc`. The first two are derived from whether the node is pruned; the rest are constants. `rpcuser` and `rpcpassword` are modelled as "must be absent", so a value on disk is discarded on the next write rather than honoured. Unlike Bitcoin Core, `mempoolfullrbf` **is** configurable here.

**Knots exposes far more policy than Core does**, and this package models all of it: parasite and token rejection, bare pubkey, anchor and datacarrier permissions, script and legacy-sigop limits, datacarrier cost, ancestor and descendant limits, dust relay fee, ephemeral and unknown-witness handling, mempool replacement and TRUC policy, coin-age and maturity relay floors, and block template sizing. Each is a plain configurable key with Knots' own default when unset.

Two keys are specific to this flavor:

| Key              | Value                | Why                                                                                                                                                                                                              |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consensusrules` | `rdts`, when present | Records your consent and silences the binary's hourly warning. It does **not** gate enforcement — this build enforces RDTS either way — so deleting it is a supported choice and the model will not resurrect it |
| `maxtipage`      | 14 days              | Upstream suppresses transaction relay while the tip is older than its default, and the RDTS chain produces a block only every day or two. Any other value is pinned back to this one                             |

**Seeded at install and then yours.** Install overrides these and nothing else:

| Key                                                                                  | Upstream default             | Seeded value                                     | Why                                    |
| ------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------ | -------------------------------------- |
| `zmqpubrawblock`, `zmqpubhashblock`, `zmqpubrawtx`, `zmqpubhashtx`, `zmqpubsequence` | off                          | ports 28332 (block) and 28333 (transaction)      | Dependent services subscribe to them   |
| `blockfilterindex`                                                                   | off                          | `basic`                                          | Dependents need BIP158 filters         |
| `dbcache`                                                                            | 450 MiB                      | 25% of system RAM, capped at 5120 MiB            | Faster initial sync                    |
| `dbbatchsize`                                                                        | 16 MiB                       | Scaled to system RAM, between 16 and 32 MiB      | Faster initial sync                    |
| `prune`                                                                              | 0 (archival)                 | The 550 MiB floor, on disks below roughly 900 GB | Fit the chain to the disk              |
| `i2psam`                                                                             | off                          | The embedded I2P router's SAM address            | I2P peering without a separate service |
| `assumevalid`                                                                        | A hash built into the binary | A hash pinned by this package                    | —                                      |

These are starting points, not assertions: nothing re-imposes them, so changing one in the config forms sticks. The two sync-boost values are the exception, and they are removed rather than re-asserted — see below.

**Derived**: `externalip` is written by `watchHosts` from the addresses actually published on the peer interface — onion addresses contributed by the Tor plugin, plus public IPv4 — and re-asserted whenever that list changes. Editing it by hand does not stick.

**Cleared automatically**: `dbcache` and `dbbatchsize` are an initial-sync boost. The `synced-true` oneshot deletes both keys from the file when sync completes, freeing the RAM. Set them again afterwards if you want the larger values permanently.

Two timing details decide when a hand edit is corrected. The enforced keys are repaired whenever the package writes the file **at all** — every init (install, update, restore) and every config action — but not on a plain restart, so an edit can survive until one of those happens. And because `main` watches the whole parsed file, any write that actually changes a value restarts the service; a form submitted unchanged is not written and does not restart.

Two values are coerced rather than enforced: a `prune` target between 1 and the 550 MiB floor is raised to the floor, and a `maxconnections` below 40 is raised to 40.

### i2pd.conf

Written only at init, which is what makes most of it yours. `merge` fills in missing keys from their defaults and repairs invalid ones; a valid value you set survives.

The exceptions are literals, repaired at the next init: `log=stdout` and `loglevel=warn` (pinned at `critical` in earlier revisions, which is how a failing SAM bridge left no trace at all), and the loopback addresses for the SOCKS proxy and I2PControl, neither of which may be exposed beyond the service's own network namespace. Everything else — bandwidth class, transit share and tunnel limits, the listen port, the web console — is a default only, and is the supported way to tune i2pd, since none of it is in the StartOS UI. Enabling `http.enabled` is what publishes the I2P console interface.

### store.json

StartOS-side state, none of it upstream configuration. `reindexBlockchain` and `reindexChainstate` are one-shot flags: the next start converts each into a bitcoind argument and clears it. `fullySynced` gates the Sync Complete notification, `snapshotInUse` records that a UTXO snapshot is loaded, and `reconsiderInvalidTips` and `rdtsEnforcedLastRun` drive chain-split recovery. `selectedWallet` records which wallet the Wallet-group actions operate on.

`rdtsAcknowledged` records the RDTS opt-in, and is **deliberately not declared by the other flavors**, whose shapes strip it — so switching away and back is a fresh opt-in to a separate network and prompts again.

The store is shared across bitcoind flavors along with the rest of the volume, which is why every flavor declares all of these keys — including ones it never acts on.

## Dependencies

One, optional and conditional on how the node is configured.

| Dependency | Kind      | Health checks | Mounts | Why                                                                  |
| ---------- | --------- | ------------- | ------ | -------------------------------------------------------------------- |
| Tor        | `running` | none          | none   | Outbound peer connections over Tor, and advertising an onion address |

It becomes a running dependency only when the node is actually set up for onion connectivity — an `externalip` containing a `.onion`, or an `onlynet` that includes `onion`. Otherwise the package declares nothing and starts without Tor.

Tor's SOCKS address is resolved over the service bridge with a fallback port, so `-onion` is passed on **every** start whether or not Tor is installed. A missing Tor is a connection refused, not an error, and the fallback keeps the address stable across Tor being installed, updated, or removed, so those events do not restart Bitcoin.

## Network Access and Interfaces

Two interfaces always, two more when ZeroMQ is enabled, and one more when the I2P web console is. A sixth binding exists with no interface attached to it at all.

| Interface          | Id            | Type | Port                   | Present                                         |
| ------------------ | ------------- | ---- | ---------------------- | ----------------------------------------------- |
| RPC                | `rpc`         | api  | 8332                   | always                                          |
| Peer               | `peer`        | p2p  | 8333 (container 58333) | always                                          |
| ZeroMQ Block       | `zmq-block`   | api  | 28332                  | when ZeroMQ is enabled                          |
| ZeroMQ Transaction | `zmq-tx`      | api  | 28333                  | when ZeroMQ is enabled                          |
| I2P Daemon Console | `i2p-console` | ui   | 7070                   | when `i2psam` is set and the i2pd console is on |

Block and transaction notifications are two interfaces rather than one because bitcoind publishes them on separate ports, so a dependent that needs only one of them (LND, for instance) can resolve it independently.

**Port 8332 does not always belong to bitcoind.** Unpruned, bitcoind binds `0.0.0.0:8332` directly. Pruned, it binds `127.0.0.1:58332` and `btc-rpc-proxy` takes 8332 and forwards to it, additionally fetching blocks the node has pruned from the p2p network on demand and verifying them against their hash, merkle root, and witness commitment before answering. The switch is automatic, and the interface, port, and credentials are identical either way.

**`peer-local` is a binding, not an interface, and dependents have to know the difference.** bitcoind plain-`bind`s container port 58333 and `whitebind`s 58334. The `peer` interface maps onto the first; the `peer-local` host publishes the second with no exported interface, which keeps it on loopback and the LXC bridge — never the LAN, never the internet. A dependent that pulls historical blocks over p2p (electrs, NBXplorer) resolves it with `sdk.host.getBridgeAddress({ hostId: peerLocalHostId, internalPort: peerPortLocal })` and connects with `noban`, `download`, and `mempool` permissions, exempt from inbound eviction and from the upload-target cutoff. Both exemptions presuppose an inbound slot to take. bitcoind reserves 11 connections for its own outbound peers, so below 12 there is no inbound capacity at all; and because Core protects up to 28 candidates before it will evict any of them, a full node cannot evict one to seat a whitelisted arrival either until it holds roughly 29 inbound peers — under that the connection is dropped at accept whatever its permissions. The config field floors at 40, the smallest value that leaves those 29 slots. Pointed at `peer` instead, it lands on the plain bind with no permissions, in the same pool as anonymous inbound peers.

## Installation and First-Run Flow

There is no setup wizard, no credential to enter, and no task raised at install — the node begins its Initial Block Download as soon as it is started. What install does do is size two settings to the hardware it landed on.

1. **Disk-aware sizing.** On a disk below roughly 900 GB, `prune` is seeded to the 550 MiB floor and the Transaction Index field is disabled in the form; above it, the node is archival. Pruning also forces `txindex` off whenever it is on.
2. **Seeded divergences.** The ZeroMQ publishers and `blockfilterindex` are switched on because dependent services need them, `i2psam` points at the embedded router, `dbcache` and `dbbatchsize` are scaled to system RAM for the duration of the sync, and `assumevalid` is pinned.
3. **Every init repairs all three models.** Install, update, and restore each merge `store.json`, `i2pd.conf`, and `bitcoin.conf`, which fills in missing keys and corrects invalid ones. An update is therefore how a new enforced value reaches an existing install.
4. **`externalip` is derived, not asked for.** It follows whatever addresses are published on the peer interface, so adding a Tor address there is what makes the node advertise it and what turns Tor into a running dependency.
5. **Every start** runs `nocow` and `clean-chainstate-old` before bitcoind, and `chain-recovery` immediately after RPC answers.
6. **When sync completes**, `synced-true` posts a Sync Complete notification and clears the two cache settings. It fires once per data directory; a reindex resets the flag, so it fires again when that finishes.

### First start after a flavor switch

Bitcoin Core and the Bitcoin Knots flavors share the `bitcoind` package id, and therefore one data directory — switching between them keeps the synced chain. bitcoind also persists a validity verdict for every block it has evaluated, trusts those verdicts verbatim at startup, and does not record which consensus rules produced them. Around a BIP-110 (RDTS) chain split that inheritance is a hazard in both directions; only one direction lands here, because Bitcoin Core never enforces RDTS.

`store.json` carries `rdtsEnforcedLastRun`, which every flavor writes on every start and this one always writes `false`. Finding anything else — `true` from the enforcing flavor, or no marker at all on a data directory last advanced by a package version predating it — is read as a change of enforcement regime, and the `chain-recovery` oneshot then runs `reconsiderblock` on every invalid chain tip so those branches are re-evaluated under this binary's rules. Reconnection is a full validation, so a genuinely invalid branch re-flags itself, and with no invalid tips the pass is a no-op.

The oneshot depends only on `bitcoind`, so it never holds up the service, and every consequential outcome posts a notification. Two things it cannot do. A tip whose fork point lies below the prune horizon is skipped, because reorganizing onto it would need blocks the node no longer stores; the notification for that points at Reindex Blockchain, which on a pruned node means re-downloading the chain. And clearing a verdict only lets the node _accept_ a chain — actually following it still requires peers serving it.

## Actions

Twenty-six actions, twenty-four of them user-facing. The OS already carries each one's name, description, warning, visibility, permitted statuses, and input schema; what follows is what it cannot. One thing applies to all of them that write `bitcoin.conf`: `main` watches the whole file, so a write that changes any value restarts the node, while a form submitted unchanged is not written and does not restart.

### Mempool, Peer, RPC, and Other Settings

The four configuration actions. Each writes only the fields it presents, and each costs seconds plus a restart. All are safe to re-run; the form is pre-filled from the current file, so re-running without editing is a no-op.

- **Other Settings** carries the two consequential ones. Turning pruning **off** sets the reindex flag, so the next start rebuilds the databases from the blocks already on disk. Turning it **on** moves RPC behind the proxy and forces `txindex` off.
- **Peer Settings** is where the embedded I2P router is switched on and off; turning the SAM proxy off here stops the router and swaps the I2P health check for a disabled placeholder.
- **Mempool Settings** and **RPC Settings** are plain field edits with no side effects beyond the restart.

### Generate RPC User Credentials, Delete RPC Users

Run **Generate RPC User Credentials** to give an external wallet or app its own login; dependent StartOS services do not need it. It appends an `rpcauth` entry to `bitcoin.conf` and returns the generated password once, masked and copyable — only a hash is stored, so a lost password cannot be recovered. Re-running with a username that already exists returns an error rather than replacing it, so it is safe to retry.

**Delete RPC Users** removes selected entries and is disabled when there are none. Deleting a user immediately breaks anything still authenticating as it.

### Reindex Blockchain, Reindex Chainstate

Both set a flag in `store.json` and then restart the node if it is running, or take effect at the next start if it is not; the reindex itself happens inside bitcoind. Both also clear `fullySynced`, so the Sync Complete notification fires again at the end.

**Reindex Blockchain** rebuilds the block and chainstate databases from genesis. On an archival node it re-uses the blocks on disk; on a pruned node it is equivalent to syncing from scratch, which can take weeks on modest hardware. **Reindex Chainstate** rebuilds only the chainstate and is strictly faster, and is hidden on pruned nodes, where it does not apply. Reach for either only for suspected corruption — they are safe to repeat, but each costs a full rebuild.

### Delete Peer List, Delete Transaction Index, Delete Coinstats Index

Three recovery actions for a corrupted file, each requiring the service to be stopped because bitcoind holds these open while running. Each deletes one thing and nothing else; the node recreates it on the next start.

| Action                   | Removes                  | Cost of the rebuild                          |
| ------------------------ | ------------------------ | -------------------------------------------- |
| Delete Peer List         | `peers.dat`              | None — peers are rediscovered                |
| Delete Transaction Index | `indexes/txindex`        | A full re-index over the chain on next start |
| Delete Coinstats Index   | `indexes/coinstatsindex` | A full re-index over the chain on next start |

All three are idempotent: deleting a file that is already gone succeeds.

### Download UTXO Snapshot (assumeutxo)

Bootstraps a new node from a UTXO snapshot instead of waiting out a full sync. Run it on a node that is still syncing; it is hidden once the node is fully synced, and disabled while a download is running or a snapshot is already loaded.

- **What it changes:** downloads the snapshot into `tmp/` on the `main` volume, loads it with `loadtxoutset` as the active chainstate, and sets `snapshotInUse` in `store.json`.
- **Cost:** hours. The download is bounded by a transfer-speed floor rather than a deadline, and it then waits — up to six hours — for the node's headers to reach the snapshot height before loading. Background sync from genesis continues underneath and eventually validates up to that height.
- **What happens next:** the action returns as soon as the download starts, so the work outlives the request. Success is visible as the chainstate jumping forward; failure arrives as a [task](#tasks).
- **Repeat safety:** safe to re-run, but not resumable across attempts. The temporary file is deleted whether the attempt succeeded or failed — `loadtxoutset` consumes it — so a retry downloads from scratch.
- **Trust:** the snapshot is checked against a hash compiled into bitcoind, but the URL is fetched before that check, so only use a source you trust. A file you serve yourself over the LAN is a good one.

### Runtime Information

A read-only snapshot for diagnosis: peer counts split inbound and outbound, block height against synced height, sync percentage, and soft-fork and BIP9 signalling state. Requires the service to be running, changes nothing, and is free to repeat.

### Wallet — Select Wallet, Get Balance, Get Address, Send Coins, Send All Coins, Sign Message, Backup wallet, Restore wallet, Remove wallet

Knots' built-in wallet, surfaced as actions. All nine are grouped under **Wallet**, all are **only available while the service is running**, and **all nine disappear entirely when `disablewallet` is on** — so a node configured without a wallet shows none of them.

- **Select Wallet** decides which wallet every other action in the group operates on, and its description names the current selection. The default is the historical hardcoded wallet name, so an existing install is unchanged.
- **Get Balance** and **Get Address** read; Get Address returns a new segwit address each time.
- **Send Coins** and **Send All Coins** spend. Both are irreversible once broadcast.
- **Sign Message** signs with one of the wallet's addresses.
- **Backup wallet** writes the wallet to a file **so that StartOS's own backup captures it** — the wallet's live database is not otherwise in a backup-safe state. **Restore wallet** reads that file back, and **Remove wallet** deletes the selected wallet from the node.

**On the RDTS chain, spending needs extra care.** The two chains share no replay protection, so a transaction broadcast here can be replayed on the other chain and spend the same coins there.

### Prioritize Transaction

Raises or lowers a transaction's effective fee in this node's own mempool, using a fee delta.

- **Cost:** seconds. No restart, and only while running.
- **It affects this node only.** The delta is local mempool bookkeeping — it changes what your node prefers to include or relay, not what the network charges.

### Hidden: RDTS Chain Opt-In, Auto-Configure, Create RPC Credentials

All three are `visibility: 'hidden'` — not user-facing, and never something to tell a user to run. **RDTS Chain Opt-In** is surfaced only by the `critical` task below; it carries the full warning about what following the RDTS chain means and records your acknowledgement. **Auto-Configure** is how a dependent service requests configuration; the surface it can reach is deliberately narrow (block filters, `blocknotify`, coinstats index, bloom filters, pruning, `txindex`, ZeroMQ), and `raw` — with `rpcauth`, `whitelist`, `externalip`, and the peer lists — is unreachable from it. **Create RPC Credentials** lets a dependent register an `rpcauth` user with a password it already holds, subject to a minimum length the user cannot override.

## Tasks

Two tasks. One blocks on a decision you have to make before this node is meaningful; the other reports a failure that happens after the action causing it has already returned.

| Task                   | Severity    | Raised when                                                       | Cleared when            |
| ---------------------- | ----------- | ----------------------------------------------------------------- | ----------------------- |
| RDTS Chain Opt-In      | `critical`  | The RDTS opt-in has not been acknowledged                         | The action runs         |
| Download UTXO Snapshot | `important` | A snapshot download or load fails; the error is the task's reason | The action is run again |

**The opt-in is `critical` because installing this flavor is not an update — it moves the node onto a different blockchain and a different network.** The action's warning states the two consequences in full: the RDTS chain kept Bitcoin's difficulty but attracted a small fraction of its hashpower, so blocks arrive roughly once every day or two and the node will look healthy while standing still; and the two chains share no replay protection, so a transaction broadcast on one can be replayed on the other.

The opt-in lives in `store.json`, not in `consensusrules` — that option is pinned by the file model and says nothing about what you agreed to. It is checked on every init, so clearing it prompts again.

The snapshot task is `important` rather than `critical`, deliberately: a node without a snapshot syncs normally, so nothing should be blocked. It can return — a second failed attempt raises it again with the new error.

## Health Checks

| Check               | Method                                                                                 | Messages                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **RPC**             | Waits for `.cookie` file, then port-listening check on `8332` (or `58332` when pruned) | Ready: "The Bitcoin RPC Interface is ready"                                                    |
| **Blockchain Sync** | `bitcoin-cli getblockchaininfo`, plus `getchaintips` when it reports IBD (polled every 30 s; 5 s during startup/failure) | Shows percentage while behind; "Bitcoin is fully synced" when caught up                        |
| **I2P**             | I2PControl API (auth + router info)                                                    | "Inbound and outbound connections" or "Outbound connections only" based on `i2pacceptincoming` |
| **Tor**             | Tor install/running status                                                             | "Inbound and outbound" when an onion address is published; otherwise "Outbound only"           |
| **Clearnet**        | Checks published IP addresses                                                          | "Inbound and outbound" when an IP address is published; otherwise "Outbound only"              |
| **RPC Proxy**       | Port listening (when pruned)                                                           | Ready: "The Bitcoin RPC Proxy is ready"                                                        |

`initialblockdownload` only means the tip is older than `-maxtipage`, which this flavor
pins at 14 days, so it also clears while a fresh sync is still that far out. Blockchain
Sync takes it as a fast path only when few blocks are in flight, then asks `getchaintips`
whether a tip that is neither `active` nor `invalid` sits above the active one — the
majority chain does not qualify, having been rejected at the split.

## Dependencies

| Dependency | Condition                                                         | Required State |
| ---------- | ----------------------------------------------------------------- | -------------- |
| **Tor**    | When `externalip` contains `.onion` or `onlynet` includes `onion` | Running        |

When a Tor onion address is added to the peer interface, it is automatically set as `externalip` in `bitcoin.conf` and advertised to peers. Other StartOS services (LND, Core Lightning, Electrs, etc.) depend on Bitcoin Knots.

## Default Overrides

Only settings that **diverge from upstream Bitcoin Knots defaults** are seeded into `bitcoin.conf` on install. All other settings are left unset, allowing bitcoind to use its built-in defaults. This keeps `bitcoin.conf` minimal and avoids drift when upstream defaults change between versions.

### Seeded overrides (written to `bitcoin.conf` on install)

| Setting                                         | Upstream Default  | Our Default                      | Reason                                                                           |
| ----------------------------------------------- | ----------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `dbcache`                                       | 450 MiB           | 25% of system RAM (max 5120 MiB) | Faster IBD; reset to upstream default automatically after initial sync completes |
| `dbbatchsize`                                   | 16777216 (16 MiB) | RAM-scaled (16–32 MiB)           | Faster UTXO writes during sync; reset to upstream default after initial sync     |
| `blockfilterindex`                              | off               | `basic`                          | Required by dependent services (Electrs, etc.) for BIP158 filters                |
| `natpmp`                                        | true              | false                            | NAT-PMP disabled to avoid unexpected port mapping on StartOS                     |
| `datacarriercost`                               | 4                 | 1                                | Treat extra data as 1 vbyte per actual byte (more permissive relay)              |
| `zmqpubrawblock`, `zmqpubhashblock`             | off               | `tcp://0.0.0.0:28332`            | Required by dependent services (LND, etc.)                                       |
| `zmqpubrawtx`, `zmqpubhashtx`, `zmqpubsequence` | off               | `tcp://0.0.0.0:28333`            | Required by dependent services (LND, etc.)                                       |
| `i2psam`                                        | off               | `127.0.0.1:7656`                 | Embedded I2P daemon for peer-to-peer privacy                                     |
| `prune` (disk < 900 GB only)                    | 0 (off)           | 550 MiB                          | Automatic pruning on smaller disks                                               |

### Knots-Specific Mempool Policy Defaults

Bitcoin Knots provides enhanced mempool filtering not available in Bitcoin Core. These settings are **upstream Knots defaults** (not our overrides) and are included here for reference:

| Setting              | Default      | Description                                             |
| -------------------- | ------------ | ------------------------------------------------------- |
| `rejectparasites`    | `true`       | Reject parasite transactions                            |
| `rejecttokens`       | `false`      | Reject token transactions (runes)                       |
| `mempoolreplacement` | `fee,-optin` | Full RBF (always replace by fee)                        |
| `mempooltruc`        | `accept`     | Accept TRUC transactions without enforcing restrictions |
| `permitbaremultisig` | `false`      | Do not relay bare multisig                              |

### Form defaults and footnotes

Every user-exposed field in the configuration actions is optional, including booleans. The pattern:

- **Number / text fields** use `default: null` when our permanent default matches upstream, or `default: <value>` when we override upstream.
- **Boolean fields** use `Value.triState` with `default: null` when our permanent default matches upstream, or `default: true` / `default: false` when we override. The null (middle) state omits the key from `bitcoin.conf` and bitcoind uses its upstream default; explicit `true` / `false` write the option.
- **`footnote: 'Default: <val>'`** — every field annotates its **upstream** bitcoind default in the footnote, so users can see what value applies when the field is left empty / null.

Where our permanent default overrides upstream, the input spec's `default` and the value seeded into `bitcoin.conf` by `seedFiles.ts` share a single source of truth: constants like `minPrune` and `defaultDatacarriercost` are exported from `bitcoin.conf.ts` and imported by `seedFiles.ts` so the form and seed cannot drift.

`dbcache` and `dbbatchsize` are special: the seeded values (`defaultDbcache()`, `defaultDbbatchsize()` — RAM-scaled) are an **IBD-only boost**. After initial sync completes, `main.ts` clears them so bitcoind reverts to upstream defaults. Because the permanent default matches upstream, the input spec uses `default: null` rather than the boost value.

## Limitations and Differences

1. **Custom Docker image** — built from source with ZMQ support; adds runtime utilities not in upstream releases
2. **Tor proxy always configured** — the `-onion` flag is set to the StartOS Tor proxy on every start; Tor itself is a conditional dependency (required only when onion connectivity is configured)
3. **RPC cookie auth enforced** — `rpcuser`/`rpcpassword` are forcibly removed; authentication uses `.cookie` or `rpcauth` credentials generated via the action
4. **Disk-aware defaults** — pruning and txindex are auto-configured based on available disk space (< 900 GB enables pruning)
5. **Pruned nodes use RPC proxy** — an intermediary `btc-rpc-proxy` container transparently fetches pruned blocks over the P2P network
6. **Shared package ID** — uses `bitcoind` as the package ID, shared with Bitcoin Core; only one flavor can be installed at a time
7. **5-minute shutdown timeout** — SIGTERM allows 300 seconds for graceful database flush
8. **Embedded I2P enabled by default** — a bundled `i2pd` daemon provides the I2P SAM proxy, with `i2pacceptincoming=true`; inbound I2P connections work out of the box with no user configuration. Can be disabled via Peer Settings
9. **CJDNS not supported** — StartOS provides no CJDNS transport, so `cjdns` is not offered as an `onlynet` option and CJDNS peer connectivity is unavailable; the other three Bitcoin networks (clearnet, Tor, I2P) are fully supported
10. **`maxtipage` pinned to 14 days** — upstream ignores peers' transactions while it considers itself syncing, so on a chain producing a block every day or two a caught-up node would keep no mempool. Pinned by the file model (`z.literal().catch()`) rather than seeded, so deleting or editing the line restores it on the next write. Core and pre-RDTS Knots parse unknown keys through rather than dropping them, so each Knots→Core `down` migration removes it alongside `consensusrules`

## What Is Unchanged from Upstream

- Block validation and consensus rules
- Peer-to-peer networking (gossip, block relay, transaction relay)
- Wallet functionality (key management, signing, coin selection)
- JSON-RPC API (all commands)
- ZeroMQ notification interface
- Transaction and block index behavior
- Knots-specific policy enforcement (rejectparasites, rejecttokens, etc.)
- Mining/block template support
- BIP compliance (BIP324, BIP158, BIP157, etc.)

## Contributing

Build and development workflow follow the StartOS packaging guide: <https://docs.start9.com/packaging>. Keep `README.md`, `instructions.md`, and `AGENTS.md` in sync with any change to user-visible behavior or package structure.

---

## Quick Reference for AI Consumers

```yaml
package_id: bitcoind
image: ./Dockerfile # upstream release binaries on debian:stable-slim
architectures:
  - x86_64
  - aarch64
  - riscv64
subcontainers:
  - bitcoind-sub # the bitcoind daemon; the one to attach to
  - i2pd-sub # purplei2p/i2pd; only while I2P is enabled
  - proxy-sub # btc-rpc-proxy; only while the node is pruned
volumes:
  main: /root/.bitcoin
  i2pd: /home/i2pd
file_models:
  - /root/.bitcoin/bitcoin.conf
  - /root/.bitcoin/store.json
  - /home/i2pd/data/i2pd.conf
startos_managed_env_vars: []
dependencies:
  - tor # optional; a running dependency only when onion connectivity is configured
interfaces:
  rpc: { type: api, port: 8332 }
  peer: { type: p2p, port: 8333 } # container 58333; 58334 is bridge-only, no interface
  zmq-block: { type: api, port: 28332 } # only when ZeroMQ is enabled
  zmq-tx: { type: api, port: 28333 } # only when ZeroMQ is enabled
  i2p-console: { type: ui, port: 7070 } # only when the i2pd web console is enabled
actions:
  - activate-rdts # hidden; surfaced by the critical opt-in task
  - mempool-config
  - peers-config
  - rpc-config
  - other-config
  - generate-rpcuser
  - delete-rpcauth
  - reindex-blockchain
  - reindex-chainstate # hidden while pruned
  - delete-peers
  - delete-txindex
  - delete-coinstats-index
  - assumeutxo # hidden once fully synced
  - runtime-info
  - autoconfig # hidden; driven by dependents
  - generate-rpc-dependent # hidden; driven by dependents
  - select-wallet # Wallet group; only-running, hidden when disablewallet
  - get-balance # Wallet group; only-running, hidden when disablewallet
  - get-address # Wallet group; only-running, hidden when disablewallet
  - send-coin # Wallet group; only-running, hidden when disablewallet
  - send-all-coin # Wallet group; only-running, hidden when disablewallet
  - sign-message # Wallet group; only-running, hidden when disablewallet
  - backup-wallet # Wallet group; only-running, hidden when disablewallet
  - restore-wallet # Wallet group; only-running, hidden when disablewallet
  - remove-wallet # Wallet group; only-running, hidden when disablewallet
  - prioritise-transaction # only-running
tasks:
  - { action: activate-rdts, severity: critical }
  - { action: assumeutxo, severity: important }
health_checks:
  - rpc: port_listening 8332 (or 58332 pruned), after .cookie file exists
  - sync-progress: bitcoin-cli_getblockchaininfo + getchaintips (30s trigger; 5s during starting/failure)
  - i2p: port_listening / status
  - tor: install/running status + onion address check
  - clearnet: published IP address check
  - rpc-proxy: port_listening (pruned only)
backup_volumes:
  - main (excluding blocks/, chainstate/, indexes/)
  - i2pd (excluding ephemeral data)
knots_specific_settings:
  - rejectparasites
  - rejecttokens
  - mempoolreplacement
  - mempooltruc
  - permitbaredatacarrier
  - permitbareanchor
  - permitbarepubkey
  - permitephemeral
  - maxscriptsize
  - datacarriercost
  - acceptnonstddatacarrier
  - dustrelayfee
  - bytespersigopstrict
  - maxtxlegacysigops
  - acceptunknownwitness
  - minrelaycoinblocks
  - minrelaymaturity
  - softwareexpiry
  - natpmp
  - maxuploadtarget
  - blockmaxsize
  - blockmaxweight
  - blockreconstructionextratxn
  - blockreconstructionextratxnsize
```
