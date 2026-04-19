## Parametrix — Oracle-Driven Parametric Risk Pools on Cardano

Parametrix is a decentralized RealFi protocol for **hedging real-world economic risks**, where measurable events are resolved via Charli3 → enabling **instant, trustless payouts**.

**Flow:** Create → Subscribe → Oracle Resolve → Deterministic Settlement

---

## Architecture (High-Level)

* **Contracts (Aiken)** → on-chain validation via Aiken
* **Offchain CLI (Deno + Mesh)** → tx orchestration (subscribe / settle)
* **Oracle Updater (FastAPI)** → fetches, aggregates, **submits oracle updates**
* **Frontend (Next.js)** → pool creation + interaction via Next.js

---

## Repository Structure

```bash
.
├── contracts
│   ├── aiken        # on-chain validators
│   └── meshjs       # tx building / integration
├── oracle-updater   # FastAPI oracle refresh service
└── parametrix-fe    # Next.js frontend dApp
```

---

## End-to-End Run (Sequential)


### 1. Start Oracle Updater (Refresh ODV Feed service)

```bash
cd oracle-updater

poetry env use /usr/bin/python3.11
poetry install

poetry run uvicorn app.main:app --reload --port 8000
```

#### Test API

Verify the API service is running:

```bash
curl http://localhost:8000/
```

**Expected response:**

```json
{
  "status": "ok",
  "service": "oracle-updater"
}
```
---

### 2. Build Smart Contracts

```bash
cd contracts/aiken/parametrix

aiken check
aiken build

```

`
Copy contracts/aiken/parametrix/plutus.json → parametrix-fe/lib/plutus.json (required for frontend)
`

From project root:
```bash
cp contracts/aiken/parametrix/plutus.json parametrix-fe/lib/plutus.json
```
---


### 3. Run Frontend dApp (Pool Creation)

```bash
cd parametrix-fe

npm install && npm run build
npm start
```

Open: `http://localhost:3000`

**In UI:**

* Connect CIP-30 wallet (tested with Eternl)
* Create a pool:

    * Select event type: **RAINFALL_EXCEEDED** - This has been tested.
    * Other fields are prefilled for demo
* Submit transaction → pool initialized on-chain

---

### 4. Subscribe + Settle execution via CLI

> Frontend currently handles **pool creation** and **ODV oracle refresh**
> 
> Custom build MeshJS based typescript CLI is used for **subscription and settlement**. UI integration for these endpoints need refinement.

Prerequisites:

* Deno installed
* Wallet JSON (mnemonic array)
* Funded wallet (ADA + DJED)
* Blockfrost key for Preprod access

---

Proceed after pool creation:

```bash
cd contracts/meshjs
```

#### Subscribe to Pool

```bash
deno run -A parametrix.ts subscribe <wallet.json> <poolId> <amount> DJED

deno run -A parametrix.ts subscribe wallet_7.json ce2-1776576767850 100 DJED

deno run -A parametrix.ts subscribe wallet_8.json ce2-1776576767850 150 DJED


```

#### Update Oracle (Required before settlement)

Use the Frontend UI → click "Refresh Oracle"
Wait for success response and oracle details to be displayed in the UI

You can also view created pools, their subscription status, and other details directly in the frontend UI

#### Settle Pool

````bash
deno run -A parametrix.ts settle <wallet.json> <poolId> DJED
```bash

deno run -A parametrix.ts settle wallet_0.json ce2-1776576767850 DJED
````

---
## Example Flow (Demo)
### 1. Start Oracle Updater

```
oracle-updater > poetry run uvicorn app.main:app --reload --port 8000
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

---

### 2. Build & Verify Contracts

```
parametrix > aiken check
... 16 checks | 0 errors

parametrix > aiken build
... Generating project's blueprint (./plutus.json)
```

---

### 3. Start Frontend

```
parametrix-fe > npm start
✓ Ready in 673ms
```

Open UI → connect wallet → create pool (`RAINFALL_EXCEEDED`)

A hedger initializes a rainfall protection pool with the following parameters:

* Coverage: 250 DJED
* Threshold: 100
* Location: JAKARTA_ID
* Premium: 1000 bps

Story:

> I am a crop farmer and my harvest season is approaching. Excess rainfall can damage yield and impact income. I am seeking protection against heavy rainfall during this period.

On submission, the pool is created on-chain:

* poolId: `ce2-1776576767850`
* txHash: `1919c1044b000938831a9d3a8c2e48da4e537f1599fe5834b58565b3cb1c7b10`
* poolAddress: `addr_test1wr8lp4skdx4fg4t93xwxewjadyfj9w3as58awg6jtw6emdqacv8y4`

Premium is locked in the script and the pool is now open for subscriptions.

---

### 4. Subscribe (CLI)

Two LPs underwrite the pool:

```
meshjs > deno run -A parametrix.ts subscribe wallet_7.json ce2-1776576767850 100 DJED

=== SUBSCRIBED ===
Tx Hash: a70caa7b346d7d6a055cad2f7cb721b9969b2d45923153395bdae9a7e43938d5
Pool ID: ce2-1776576767850
Deposited: 100000000
Minted sPMX: 100
==================
```

```
meshjs > deno run -A parametrix.ts subscribe wallet_8.json ce2-1776576767850 150 DJED

=== SUBSCRIBED ===
Tx Hash: 7c215388a4dfa06ca01c822ff923256665529c8986bb5684a5fb3ca200b964f1
Pool ID: ce2-1776576767850
Deposited: 150000000
Minted sPMX: 150
==================
```

---

### 5. Oracle Update (Frontend)

Click **"Refresh Oracle"** in UI → oracle tx submitted

---

### 6. Settle (CLI)

```
meshjs > deno run -A parametrix.ts settle wallet_0.json ce2-1776576767850 DJED
[C3] Fetching UTxOs...
{ price: 0.2481, timestamp: 1776577770000, expiry: 1776578370000 }

SETTLEMENT CRITERIA
eventOccurred: true
event_type: RAINFALL_EXCEEDED
event_threshold: 100
scale oracle_price metric: 248100

--- paylouts ---
addr_test1... 10000000
addr_test1... 15000000
addr_test1... 250000000
========================

=== SETTLED ===
Tx Hash: ce7275d3857b6dd391e4fb2a80c7c7e51f78938e8c661d06eb698a900de39f01
Risk event occurred: true
================
```

---


## Offchain CLI Module

* Built with Mesh SDK
* Uses compiled Aiken validators (`plutus.json`)
* Handles:

    * Subscription (liquidity provision)
    * Settlement (oracle evaluation + payouts)

---

## Oracle API Service (FastAPI wrapper over Charli3 ODV Pull Client)

* `/oracle/feeds` → signed node data (debug)
* `/oracle/aggregate` → **fetch → aggregate → build → submit tx**

---

## Key Design Decisions

* **No claims layer** → oracle is truth
* **Deterministic settlement** → `price > threshold`
* **Reference inputs** → efficient oracle reads
* **CLI for critical flows** → precise execution control
* **Modular architecture** → FE / CLI / oracle separation

---

## What This Demonstrates

* Real-world data → on-chain execution
* Autonomous insurance primitive
* Composable risk markets on Cardano

---

## Tagline

**Hedge real-world uncertainty, on-chain.**

