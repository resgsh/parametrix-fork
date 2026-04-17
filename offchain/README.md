# Parametrix — Charli3 Oracle Integration (Mesh)

Minimal setup to fetch and parse Charli3 oracle UTxOs using Mesh (Blockfrost) and TypeScript.

## Overview

This module demonstrates how to:

* Query oracle UTxOs from chain
* Filter relevant oracle outputs (policy + NFT)
* Decode inline datum (CBOR → structured data)
* Extract usable price, timestamp, and expiry

This forms the base for integrating oracle data into on-chain contract flows.

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run test script:

```bash
npm run c3
```

---

## Structure

```bash
src/
├── c3/
│   ├── charli3Oracle.ts   # oracle fetch + decode logic
│   └── test/
│       └── c3Test.ts      # example usage
```

---

## How it works

1. Fetch all UTxOs at oracle address
2. Filter by:

    * policy ID
    * oracle NFT (C3AS)
3. Ensure inline datum exists
4. Decode datum structure
5. Select latest valid oracle value

---

## Output

Example:

```bash
Oracle UTxO: <txHash> <index>
Price: <value>
Timestamp: <ms>
Expiry: <ms>
```

---

## Notes

* Uses Mesh SDK for chain queries
* Works with Charli3 ODV-compatible oracle outputs
* Decoder handles actual on-chain datum structure (map-based encoding)
* Filters out invalid / non-price UTxOs safely
