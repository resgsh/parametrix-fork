## Parametrix — Oracle-Driven Parametric Risk Pools on Cardano

Parametrix is a decentralized protocol for **parametric risk pools**, where real-world events are resolved via Charli3 → enabling **instant, trustless payouts**.

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


### 1. Start Oracle Updater (Writer + Submitter)

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

### 4. Core Execution via CLI (Subscribe + Settle)

> Frontend currently handles **pool creation**
> CLI is used for **subscription and settlement**. UI integration for these endpoints need refinement.

Prerequisites:

* Deno installed
* Wallet JSON (mnemonic array)
* Funded wallet (ADA + DJED)
* Blockfrost key for Preprod access

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

    * Select event type: **RAINFALL_EXCEEDED**
    * Other fields are prefilled for demo
* Submit transaction → pool initialized on-chain

---

### 4. Subscribe + Settle execution via CLI

> Frontend currently handles **pool creation** and **ODV oracle refresh**
> CLI is used for **subscription and settlement**. UI integration for these endpoints need refinement.

Prerequisites:

* Deno installed
* Wallet JSON (mnemonic array)
* Funded wallet (ADA + DJED)
* Blockfrost key for Preprod access

---

Proceed after pool creation:

#### Subscribe to Pool

```bash
deno run -A parametrix.ts subscribe <wallet.json> <poolId> <amount> DJED
```

#### Update Oracle (Required before settlement)

Use the Frontend UI → click "Refresh Oracle"
Wait for success response and oracle details to be displayed in the UI

You can also view created pools, their subscription status, and other details directly in the frontend UI

#### Settle Pool

````bash
deno run -A parametrix.ts settle <wallet.json> <poolId> DJED
```bash
deno run -A parametrix.ts settle <wallet.json> <poolId> DJED
````

---

## User Flow (Demo)

1. **Create Pool (Frontend)**

    * Define event (type, threshold, timing)
    * Deposit premium

2. **Subscribe (CLI)**

    * Provide liquidity
    * Receive position tokens

3. **Oracle Update**

    * `/oracle/aggregate` → auto-submit tx

4. **Settle (CLI)**

    * Contract reads oracle (reference input)
    * Deterministic payout execution

---

## Offchain CLI Module

* Built with Mesh SDK
* Uses compiled Aiken validators (`plutus.json`)
* Handles:

    * Subscription (liquidity provision)
    * Settlement (oracle evaluation + payouts)

---

## Oracle Service

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
