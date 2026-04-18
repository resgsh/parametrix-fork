import {
    deserializeAddress,
    KoiosProvider,
    mAssetClass,
    mConStr0, mConStr1,
    MeshTxBuilder,
    mPubKeyAddress,
    pubKeyAddress,
    resolvePaymentKeyHash,
    resolveScriptHash,
    scriptHash,
    serializeAddressObj, SLOT_CONFIG_NETWORK,
    serializePlutusScript,
    stringToHex, unixTimeToEnclosingSlot,
    UTxO, BlockfrostProvider,applyParamsToScript,deserializeDatum
} from "@meshsdk/core";

import {builtinByteString, hexToString} from "@meshsdk/common";
import {assetClass} from "@meshsdk/common";

import blueprint from "../plutus.json" with {type: "json"};
import {C3_CONFIG, getC3OracleData} from "../oracle/charli3Oracle";
import {getWalletInfoForTx} from "@/lib/meshjs/wallet-util";
import {blockchainProvider, getTxBuilder} from "@/lib/common";

const NETWORK = 'preprod';
const NETWORK_ID = 0;
const MICRO_UNITS = 1000000
const FEE_ADDRESS = "addr_test1qrxyezc0h7pzg3uv83v30ttmec4navpw8u5q5ft3w72ysvae7m8kn49reh566kzdzjtt0rwxfdj39gvm54z5z7tn4lrsqneynj"
const COVERAGE = 100 * MICRO_UNITS;
const PREMIUM_BPS = 500;

function getScriptAddress(compiled: string): string {
    const {address} = serializePlutusScript(
        {code: compiled, version: "V3"},
        undefined,
        NETWORK_ID
    );
    return address;
}

function getValidator(name: string) {
    const v = blueprint.validators.find(v =>
        v.title.startsWith(name)
    );
    if (!v) {
        throw new Error(`Validator not found: ${name}`);
    }
    return v.compiledCode;
}

type Asset = {
    policyId: string;
    assetNameHex: string;
    unit: string;
};

export const assetMap: Record<string, Asset> = {
    ADA: {
        policyId: "",
        assetNameHex: "",
        unit: "lovelace",
    },

    DJED: {
        policyId: "c3a654d54ddc60c669665a8fc415ba67402c63b58fe65c821d63ba07",
        assetNameHex: "446a65644d6963726f555344",// ("DjedMicroUSD"),
        unit: "c3a654d54ddc60c669665a8fc415ba67402c63b58fe65c821d63ba07446a65644d6963726f555344",
    },

    USDM: {
        policyId: "a1b2c3d4e5f6...", // TODO replace
        assetNameHex: stringToHex("USDM"),
        unit: "xxx",

    },
};

function buildPubKeyAddress(feeAddrBech32: string) {
    return pubKeyAddress(deserializeAddress(feeAddrBech32).pubKeyHash, deserializeAddress(feeAddrBech32).stakeCredentialHash);
}

function buildMPubKeyAddress(bech32Address: string) {
    return mPubKeyAddress(deserializeAddress(bech32Address).pubKeyHash, deserializeAddress(bech32Address).stakeCredentialHash)
}

function loadScripts(asset: any, feeAddrBech32: string, poolId: string) {
    const registryCompiled = getValidator("registry.");

    const paymentAsset = assetClass(
        asset.policyId,
        asset.assetNameHex
    );

    const feeAddr = buildPubKeyAddress(feeAddrBech32);

    const registryScript = applyParamsToScript(
        registryCompiled,
        [
            feeAddr,        // v_fee_addr
            paymentAsset,   // v_payment_asset
        ],
        "JSON"
    );

    let registryPolicyId = resolveScriptHash(registryScript, 'V3');


    // ---------------- PARAMETRIX (pool validator) ----------------
    const poolCompiled = getValidator("parametrix.");
    const poolIdHex = stringToHex(poolId)

    const poolScript = applyParamsToScript(
        poolCompiled,
        [
            scriptHash(registryPolicyId),          // reg_policy_id
            scriptHash(C3_CONFIG.policyId),    // oracle_policy_id
            builtinByteString(poolIdHex),                 // v_pool_id
        ],
        "JSON"
    );

    return {
        registry: {
            script: registryScript,
            address: getScriptAddress(registryScript),
            policyId: registryPolicyId
        },

        pool: {
            script: poolScript,
            address: getScriptAddress(poolScript),
            policyId: resolveScriptHash(poolScript, 'V3')
        },
    };
}

// --------------------------------------------------
// DATUM (STRICT ORDER)
// --------------------------------------------------
function buildPoolDatum(
    poolId: string,
    asset: any,
    hedgerAddr: string,
    eventType: string,
    threshold: number,
    coverage: number,
    premiumBps: number,
    feeAddr: string
) {
    // --- Time configuration (hackathon presets) ---
    const now = Date.now();

    const startTime = now;                          // pool opens immediately
    const endTime = now + 24 * 60 * 60 * 1000;      // subscriptions close in 24h
    const eventTime = endTime + 5 * 60 * 1000;      // oracle evaluation shortly after
    const settlementTime = now;                     // simplified (for demo)

    return mConStr0([
        poolId,                                       // unique pool identifier

        mAssetClass(asset.policyId, asset.assetNameHex), // asset used (DJED)

        buildMPubKeyAddress(hedgerAddr),              // hedger (protection buyer)

        eventType,                                    // oracle event type (rainfall / flight)

        threshold,                                    // value required to trigger payout

        coverage,                                     // payout amount to hedger if event occurs

        premiumBps,                                   // premium rate (in basis points)

        startTime,                                    // subscription start
        endTime,                                      // subscription end

        eventTime,                                    // oracle check time
        settlementTime,                               // settlement execution time

        buildMPubKeyAddress(feeAddr),                 // protocol / fee address

        premiumBps,                                   // ⚠️ duplicate field (confirm purpose: fee or reuse)
    ]);
}

function buildContributionDatum(ownerAddr: string, amount: number, amount_type: string) {
    const contributionDatum = mConStr0([
        buildMPubKeyAddress(ownerAddr),
        amount,
        amount_type,
    ]);

    return mConStr0([
        [contributionDatum]
    ]);
}


// --------------------------------------------------
// CREATE POOL (MINT)
// --------------------------------------------------

export async function createPool(
    wallet: any,
    paymentAssetCode: string,
    eventType: string,
    coverage: number,
    premiumBps: number,
    threshold: number,
    feeAddress: string = FEE_ADDRESS
) {
    console.log("createPool params:", {
        paymentAssetCode,
        eventType,
        coverage,
        premiumBps,
        threshold,
        feeAddress,
    });
    const {collateral, walletAddress} = await getWalletInfoForTx(wallet);
    console.log("walletAddress", walletAddress)
    const hedgerPkh = resolvePaymentKeyHash(walletAddress);
    const poolId = `${hedgerPkh.slice(0, 3)}-${Date.now()}`;


    const provider = blockchainProvider;
    const utxos = await provider.fetchAddressUTxOs(walletAddress);
    if (!utxos.length) throw new Error('No wallet UTxOs');

    // @ts-ignore
    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const {registry, pool} = loadScripts(asset, feeAddress, poolId);

    const coverageAmount = coverage * MICRO_UNITS; // human → onchain

    // ---------------- DATUM ----------------
    const datum = buildPoolDatum(
        poolId,
        asset,
        walletAddress,
        eventType,
        threshold,
        coverageAmount,
        premiumBps,
        feeAddress
    );

    const premium_micro_units = (coverageAmount * premiumBps) / 10_000;

    const tx = getTxBuilder()

    try {
        await tx
            .mintPlutusScriptV3()
            .mint("1", registry.policyId, stringToHex(poolId))
            .mintingScript(registry.script)
            .mintRedeemerValue(stringToHex(poolId))

        // ---------------- POOL UTXO ----------------
        .txOut(pool.address, [
            {
                unit: registry.policyId + stringToHex(poolId),
                quantity: "1",
            },
        ])
            .txOutInlineDatumValue(datum)

        // ---------------- Premium UTXO ----------------
        .txOut(pool.address, [
            {
                unit: asset.unit,
                quantity: premium_micro_units.toString(),
            },
        ])
            .txOutInlineDatumValue(buildContributionDatum(walletAddress, premium_micro_units, "PREMIUM"))

            .requiredSignerHash(hedgerPkh)

        .txInCollateral(
            collateral!.input.txHash,
            collateral!.input.outputIndex,
            collateral!.output.amount,
            collateral!.output.address
        )

            .changeAddress(walletAddress)
            .selectUtxosFrom(utxos)
            .complete();
    } catch (e) {
        console.error(e)
    }

    return {
        unsignedTx: tx.txHex,
        poolId,

        // for reference
        poolAddress: pool.address,
        paymentAssetCode,
        feeAddress,

        // script / NFT identity
        registryPolicyId: registry.policyId,
        tokenNameHex: stringToHex(poolId),

        // useful context
        hedgerAddress: walletAddress,
        coverage,
        premiumBps,
        threshold,
    };
}


export interface PoolDatumObject {
    pool_id: string;                 // hex (ByteArray)
    payment_asset: any;              // AssetClass (keep raw or type if you have one)
    hedger: string;                 // bech32

    event_type: string;             // decoded string
    event_threshold: number;

    coverage_target: number;
    premium_bps: number;

    subscription_start: number;
    subscription_end: number;

    event_time: number;
    settlement_time: number;

    fee_addr: string;               // bech32

    fee_bps: number;
}


function parsePoolDatumFromUtxo(utxo: UTxO): PoolDatumObject {
    const datum = deserializeDatum(utxo.output.plutusData!)

    console.dir(datum, {depth: null});
    return {
        pool_id: datum.fields[0].bytes,
        payment_asset: datum.fields[1],
        hedger: serializeAddressObj(datum.fields[2]),

        event_type: hexToString(datum.fields[3].bytes),
        event_threshold: Number(datum.fields[4].int),

        coverage_target: Number(datum.fields[5].int),
        premium_bps: Number(datum.fields[6].int),

        subscription_start: Number(datum.fields[7].int),
        subscription_end: Number(datum.fields[8].int),

        event_time: Number(datum.fields[9].int),
        settlement_time: Number(datum.fields[10].int),

        fee_addr: serializeAddressObj(datum.fields[11]),

        fee_bps: Number(datum.fields[12].int),
    };
}

export function calculatePoolValidityLimit(subscriptionEnd: number) {
    const now = Date.now();

    if (now > subscriptionEnd) {
        throw new Error("Subscription ended");
    }

    const twelveHoursFromNow = now + 12 * 60 * 60 * 1000;
    const endWithBuffer = subscriptionEnd + 2 * 60 * 60 * 1000;

    const minTimestamp = Math.min(
        twelveHoursFromNow,
        endWithBuffer
    );

    return unixTimeToEnclosingSlot(
        minTimestamp,
        SLOT_CONFIG_NETWORK.preprod
    );
}

export async function subscribe(
    wallet: any, // ✅ changed
    poolId: string,
    amount: number,
    paymentAssetCode: string,
    feeAddress: string = FEE_ADDRESS
) {
    console.log("subscribe() inputs:", {
        hasWallet: !!wallet,
        walletKeys: wallet ? Object.keys(wallet) : null,
        poolId,
        amount,
        paymentAssetCode,
        feeAddress,
    });
    // const wallet = loadWallet(walletFile);
    const { collateral, walletAddress: subscriberAddr } = await getWalletInfoForTx(wallet); // ✅ changed
    const subscriberPkh = resolvePaymentKeyHash(subscriberAddr);

    const provider = blockchainProvider;
    const subscriberUtxos = await provider.fetchAddressUTxOs(subscriberAddr);
    if (!subscriberUtxos.length) throw new Error("No wallet UTxOs");

    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const {registry, pool} = loadScripts(asset, feeAddress, poolId);
    console.log("---- SCRIPT DERIVATION ----");
    console.log("poolId:", poolId);
    console.log("feeAddress:", feeAddress);
    console.log("registry.policyId:", registry.policyId);
    console.log("pool.address:", pool.address);

    // ---------------- FIND REGISTRY REF INPUT ----------------
    const poolUtxos = await provider.fetchAddressUTxOs(pool.address);
    console.log("---- POOL UTXOS ----");
    console.log("poolUtxo count:", poolUtxos.length);

    const nftUnit = registry.policyId + stringToHex(poolId);
    // console.log("---- NFT EXPECTATION ----");
    // console.log("tokenNameHex:", stringToHex(poolId));
    // console.log("expected nftUnit:", nftUnit);

    const refUtxo = poolUtxos.find((u: any) =>
        u.output.amount.some((a: any) => a.unit === nftUnit)
    );

    if (!refUtxo) throw new Error("Registry ref UTxO not found");

    const poolDatum = parsePoolDatumFromUtxo(refUtxo);

    //console.log("Parsed Pool Datum:", poolDatum);

    const poolAddr = refUtxo.output.address;

    // ---------------- CALCULATIONS ----------------
    const deposited = amount * MICRO_UNITS;
    const subscribed_units = amount

    if (subscribed_units <= 0) {
        throw new Error("Deposit too small for subscription unit");
    }

    const invalidHereafter = calculatePoolValidityLimit(
        poolDatum.subscription_end
    );

    // ---------------- TX ----------------
    // const collateral = (await wallet.getCollateral())[0];

    const tx = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
        evaluator: provider
    }).setNetwork(NETWORK);

    await tx
        .mintPlutusScriptV3()
        .mint(
            subscribed_units.toString(),
            pool.policyId,
            stringToHex("sPMX")
        )
        .mintingScript(pool.script)
        .mintRedeemerValue(mConStr0([]))

        .txOut(poolAddr, [
            {
                unit: asset.unit,
                quantity: deposited.toString(),
            },
        ])
        .txOutInlineDatumValue(
            buildContributionDatum(
                subscriberAddr,
                deposited,
                "SUBSCRIPTION"
            )
        )
        .invalidHereafter(invalidHereafter)
        .readOnlyTxInReference(
            refUtxo.input.txHash,
            refUtxo.input.outputIndex
        )

        .requiredSignerHash(subscriberPkh)

        .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address
        )

        .changeAddress(subscriberAddr)
        .selectUtxosFrom(subscriberUtxos)
        .complete();

    console.log("Tx built")
    return { unsignedTx: tx.txHex }; // ✅ changed
}


export interface ContributionDatumObject {
    owner: string;        // bech32
    amount: number;
    amount_type: string;  // "PREMIUM" | "SUBSCRIPTION"
}

export interface ParsedContributionUtxo {
    utxo: any;
    contributions: ContributionDatumObject[];
}
function parseContributionDatumFromUtxo(u: any): ParsedContributionUtxo | null {
    try {
        if (!u.output.plutusData) return null;

        const d = deserializeDatum(u.output.plutusData);

        // normalize constructor (bigint → number)
        const ctor = Number(d.constructor);

        if (
            ctor !== 0 ||
            !Array.isArray(d.fields)
        ) {
            return null;
        }

        const field0 = d.fields[0];

        // 🔁 emulate CSL `.list`
        const list = Array.isArray(field0)
            ? field0
            : field0?.list;

        if (!Array.isArray(list)) {
            return null;
        }

        const contributions = list.map((item: any) => {
            const innerCtor = Number(item.constructor);

            if (
                innerCtor !== 0 ||
                !Array.isArray(item.fields) ||
                item.fields.length !== 3
            ) {
                throw new Error("Invalid ContributionDatum shape");
            }

            return {
                owner: serializeAddressObj(item.fields[0]),
                amount: Number(item.fields[1].int),
                amount_type: hexToString(item.fields[2].bytes),
            };
        });

        return {
            utxo: u,
            contributions,
        };
    } catch (e) {
        console.log("parse fail:", e);
        return null;
    }
}

export async function settle(
    wallet: any, // ✅ changed
    poolId: string,
    paymentAssetCode: string,
    feeAddress: string = FEE_ADDRESS
) {
    const { collateral, walletAddress: addr } = await getWalletInfoForTx(wallet); // ✅ changed
    const pkh = resolvePaymentKeyHash(addr);

    const provider = blockchainProvider; // ✅ changed
    const utxos = await provider.fetchAddressUTxOs(addr);
    if (!utxos.length) throw new Error("No wallet UTxOs");

    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const { pool, registry } = loadScripts(asset, feeAddress, poolId);

    // ---------------- REGISTRY REF ----------------
    const poolUtxos = await provider.fetchAddressUTxOs(pool.address);
    const nftUnit = registry.policyId + stringToHex(poolId);

    const regRef = poolUtxos.find((u: any) =>
        u.output.amount.some((a: any) => a.unit === nftUnit)
    );

    if (!regRef) throw new Error("Registry ref not found");

    const poolDatum = parsePoolDatumFromUtxo(regRef);

    // ---------------- ORACLE REF ----------------
    const { utxo: oracleUtxo, data: oracleData } = await getC3OracleData();

    const priceMetricMatchingOnChain = oracleData.price * 1_000_000;

    const eventOccurred =
        poolDatum.event_type === "RAINFALL_EXCEEDED"
            ? priceMetricMatchingOnChain > poolDatum.event_threshold
            : false;

    // ---------------- SCRIPT UTXOs ----------------
    if (!poolUtxos.length) throw new Error("No pool UTxOs");

    const fundingPoolUtxoDatumPairs = poolUtxos
        .map(parseContributionDatumFromUtxo)
        .filter((x): x is ParsedContributionUtxo => x !== null);

    let premiumUtxoDatumPair: ParsedContributionUtxo | null = null;
    const subscriptionUtxosDatumPairs: ParsedContributionUtxo[] = [];

    for (const p of fundingPoolUtxoDatumPairs) {
        for (const c of p.contributions) {
            if (c.amount_type === "PREMIUM") {
                premiumUtxoDatumPair = p;
                break;
            }

            if (c.amount_type === "SUBSCRIPTION") {
                subscriptionUtxosDatumPairs.push(p);
                break;
            }
        }
    }

    if (!premiumUtxoDatumPair || subscriptionUtxosDatumPairs.length === 0) {
        console.log("No relevant UTxOs found. Exiting.");
        return;
    }

    let tx = new MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
        evaluator: provider,
    }).setNetwork(NETWORK);

    const payouts = new Map<string, number>();
    let totalPrincipalSettled = 0;

    for (const p of subscriptionUtxosDatumPairs) {
        const utxo = p.utxo;

        for (const c of p.contributions) {
            const premiumShare = Math.floor(
                (c.amount * poolDatum.premium_bps) / 10_000
            );

            if (!eventOccurred) {
                const expected = c.amount + premiumShare;
                payouts.set(c.owner, (payouts.get(c.owner) || 0) + expected);
            } else {
                payouts.set(c.owner, (payouts.get(c.owner) || 0) + premiumShare);
                totalPrincipalSettled += c.amount;
            }
        }

        tx = tx
            .spendingPlutusScriptV3()
            .txIn(
                utxo.input.txHash,
                utxo.input.outputIndex,
                utxo.output.amount,
                pool.address
            )
            .txInInlineDatumPresent()
            .txInRedeemerValue(mConStr1([]))
            .txInScript(pool.script);
    }

    if (premiumUtxoDatumPair) {
        tx = tx
            .spendingPlutusScriptV3()
            .txIn(
                premiumUtxoDatumPair.utxo.input.txHash,
                premiumUtxoDatumPair.utxo.input.outputIndex,
                premiumUtxoDatumPair.utxo.output.amount,
                pool.address
            )
            .txInInlineDatumPresent()
            .txInRedeemerValue(mConStr1([]))
            .txInScript(pool.script);
    }

    if (eventOccurred) {
        payouts.set(poolDatum.hedger, totalPrincipalSettled);
    }

    payouts.forEach((amt, to) => {
        tx = tx.txOut(to, [
            {
                unit: asset.unit,
                quantity: amt.toString(),
            },
        ]);
    });

    const invalidHereafter = calculatePoolValidityLimit(
        poolDatum.subscription_end
    );

    await tx
        .readOnlyTxInReference(regRef.input.txHash, regRef.input.outputIndex)
        .readOnlyTxInReference(
            oracleUtxo.input.txHash,
            oracleUtxo.input.outputIndex
        )
        .requiredSignerHash(pkh)
        .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address
        )
        .invalidHereafter(invalidHereafter)
        .changeAddress(addr)
        .selectUtxosFrom(utxos)
        .complete();

    return { unsignedTx: tx.txHex }; // ✅ changed
}