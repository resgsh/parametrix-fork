import {deserializeDatum, UTxO} from "@meshsdk/core";
import {getAddressUtxos} from "../common";

// ---------------- CONFIG ----------------
export const C3_CONFIG = {
    oracleAddress: "addr_test1wq3pacs7jcrlwehpuy3ryj8kwvsqzjp9z6dpmx8txnr0vkq6vqeuu",
    policyId: "886dcb2363e160c944e63cf544ce6f6265b22ef7c4e2478dd975078e",
    oracleFeedTokenNameHex: "43334153", // C3AS
};

// ---------------- TYPES ----------------
export interface C3OracleData {
    price: number;
    timestamp: number;
    expiry: number;
}

export interface C3OracleResult {
    utxo: UTxO;
    data: C3OracleData;
}

// ---------------- DECODER (NULL SAFE) ----------------
export function decodeC3Datum(plutusData: string): C3OracleData | null {
    try {
        const raw: any = deserializeDatum(plutusData);

        // debug (optional)
        //console.log("[C3] RAW:");
        //console.dir(raw, { depth: null });

        const pairs = raw?.fields?.[0]?.fields?.[0]?.map;
        if (!pairs) return null;

        let price = 0,
            timestamp = 0,
            expiry = 0;

        for (const p of pairs) {
            if (p?.k?.int === undefined || p?.v?.int === undefined) continue;

            const k = Number(p.k.int);
            const v = Number(p.v.int);

            if (k === 0) price = v;
            else if (k === 1) timestamp = v;
            else if (k === 2) expiry = v;
        }

        if (!timestamp || !expiry) return null;

        return {
            price: price / 1_000_000,
            timestamp,
            expiry,
        };
    } catch {
        return null;
    }
}

// ---------------- CORE ----------------
export async function getC3OracleUtxo(
    oracleAddress: string,
    policyId: string
): Promise<UTxO> {
    console.log("[C3] Fetching UTxOs...");

    const utxos: UTxO[] = await getAddressUtxos({
        scriptAddress: oracleAddress,
        asset: "",
    });

    console.log("[C3] Total UTxOs:", utxos.length);

    // Stage 1: policy filter
    const policyFiltered = utxos.filter((u) =>
        u.output.amount.some((a) => a.unit.startsWith(policyId))
    );

    console.log("[C3] Policy matches:", policyFiltered.length);

    // Stage 2: NFT filter
    const unit = policyId + C3_CONFIG.oracleFeedTokenNameHex;

    const nftFiltered = policyFiltered.filter((u) =>
        u.output.amount.some((a) => a.unit === unit)
    );

    console.log("[C3] C3AS matches:", nftFiltered.length);

    // Stage 3: datum present
    const datumFiltered = nftFiltered.filter((u) => !!u.output.plutusData);

    console.log("[C3] With datum:", datumFiltered.length);

    // Stage 4: decode + filter
    const decodedList = datumFiltered
        .map((u) => {
            const d = decodeC3Datum(u.output.plutusData!);
            return d ? { utxo: u, data: d } : null;
        })
        .filter((x): x is { utxo: UTxO; data: C3OracleData } => x !== null);

    console.log("[C3] Valid datums:", decodedList.length);

    if (decodedList.length === 0) {
        throw new Error("No valid oracle datums");
    }

    // Stage 5: pick latest
    const result = decodedList.reduce((latest, current) =>
        current.data.timestamp > latest.data.timestamp ? current : latest
    );

    //console.log("[C3] Selected:", result.utxo.input.txHash.slice(0, 8));

    return result.utxo;
}

// ---------------- HIGH LEVEL ----------------
export async function getC3OracleData(): Promise<C3OracleResult> {
    const utxo = await getC3OracleUtxo(
        C3_CONFIG.oracleAddress,
        C3_CONFIG.policyId
    );

    const data = decodeC3Datum(utxo.output.plutusData!);

    if (!data) {
        throw new Error("Decoded datum unexpectedly null");
    }

    return { utxo, data };
}

// ---------------- EXAMPLE ----------------
export async function c3FetchExample() {
    const { utxo, data } = await getC3OracleData();

    console.log("Oracle UTxO:", utxo.input.txHash, utxo.input.outputIndex);
    console.log("Price:", data.price);
    console.log("Timestamp:", data.timestamp);
    console.log("Expiry:", data.expiry);
}
