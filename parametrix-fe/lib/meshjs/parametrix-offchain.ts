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
    UTxO
} from "@meshsdk/core";

import {applyParamsToScript, parseInlineDatum} from "@meshsdk/core-csl";
import {builtinByteString, hexToString} from "@meshsdk/common";
import {assetClass} from "@meshsdk/common";

import blueprint from "../plutus.json" with {type: "json"};
import {C3_CONFIG, getC3OracleData} from "../oracle/charli3Oracle";

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

export const assetMap = {
    ADA: {
        policyId: "",
        assetNameHex: "",
        unit: "lovelace",
    },

    DJED: {
        policyId: "c3a654d54ddc60c669665a8fc415ba67402c63b58fe65c821d63ba07",
        assetNameHex: "446a65644d6963726f555344",
        unit: "c3a654d54ddc60c669665a8fc415ba67402c63b58fe65c821d63ba07446a65644d6963726f555344",
    }
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
            feeAddr,
            paymentAsset,
        ],
        "JSON"
    );

    let registryPolicyId = resolveScriptHash(registryScript, 'V3');

    const poolCompiled = getValidator("parametrix.");
    const poolIdHex = stringToHex(poolId)

    const poolScript = applyParamsToScript(
        poolCompiled,
        [
            scriptHash(registryPolicyId),
            scriptHash(C3_CONFIG.policyId),
            builtinByteString(poolIdHex),
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

function buildPoolDatum(poolId: string, asset: any, hedgerAddr: string, eventType: string, feeAddr: string) {

    const eventThreshold = eventType === "RAINFALL_EXCEEDED" ? 100 : 999999;

    return mConStr0([
        poolId,
        mAssetClass(asset.policyId, asset.assetNameHex),
        buildMPubKeyAddress(hedgerAddr),

        eventType,
        eventThreshold,
        COVERAGE,
        500,

        Date.now(),
        Date.now() + 60 * 60 * 24 * 1000,
        Date.now() + 100,
        1776475090000,
        buildMPubKeyAddress(feeAddr),
        500,
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

// ================= CREATE =================

export async function createPool(wallet: any, paymentAssetCode: string, eventType: string, feeAddress: string = FEE_ADDRESS) {

    const changeAddress = await wallet.getChangeAddress();
    const hedgerPkh = resolvePaymentKeyHash(changeAddress);
    const poolId = `${hedgerPkh.slice(0, 3)}-${Date.now()}`;

    const utxos = await wallet.getUtxos();
    if (!utxos.length) throw new Error('No wallet UTxOs');

    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const {registry, pool} = loadScripts(asset, feeAddress, poolId);
    const collateral = (await wallet.getCollateral())[0];

    const datum = buildPoolDatum(poolId, asset, changeAddress, eventType, feeAddress);

    const premium_micro_units = (COVERAGE * PREMIUM_BPS) / 10_000;

    const tx = new MeshTxBuilder({
        fetcher: wallet,
        submitter: wallet,
        evaluator: wallet
    }).setNetwork(NETWORK);

    await tx
        .mintPlutusScriptV3()
        .mint("1", registry.policyId, stringToHex(poolId))
        .mintingScript(registry.script)
        .mintRedeemerValue(stringToHex(poolId))

        .txOut(pool.address, [{ unit: registry.policyId + stringToHex(poolId), quantity: "1" }])
        .txOutInlineDatumValue(datum)

        .txOut(pool.address, [{ unit: asset.unit, quantity: premium_micro_units.toString() }])
        .txOutInlineDatumValue(buildContributionDatum(changeAddress, premium_micro_units, "PREMIUM"))

        .requiredSignerHash(hedgerPkh)

        .txInCollateral(collateral.input.txHash, collateral.input.outputIndex, collateral.output.amount, collateral.output.address)

        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

    return {unsignedTx: tx.txHex, poolId: poolId};
}

// ================= SUBSCRIBE =================

export async function subscribe(wallet: any, poolId: string, amount: number, paymentAssetCode: string, feeAddress: string = FEE_ADDRESS) {

    const subscriberAddr = await wallet.getChangeAddress();
    const subscriberPkh = resolvePaymentKeyHash(subscriberAddr);

    const provider = new KoiosProvider(NETWORK);
    const subscriberUtxos = await wallet.getUtxos();

    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const {registry, pool} = loadScripts(asset, feeAddress, poolId);

    const poolUtxo = await provider.fetchAddressUTxOs(pool.address);

    const nftUnit = registry.policyId + stringToHex(poolId);

    const refUtxo = poolUtxo.find((u: any) =>
        u.output.amount.some((a: any) => a.unit === nftUnit)
    );

    if (!refUtxo) throw new Error("Registry ref UTxO not found");

    const poolAddr = refUtxo.output.address;

    const deposited = amount * MICRO_UNITS;

    const collateral = (await wallet.getCollateral())[0];

    const tx = new MeshTxBuilder({
        fetcher: wallet,
        submitter: wallet,
        evaluator: wallet
    }).setNetwork(NETWORK);

    await tx
        .mintPlutusScriptV3()
        .mint(amount.toString(), pool.policyId, stringToHex("sPMX"))
        .mintingScript(pool.script)
        .mintRedeemerValue(mConStr0([]))

        .txOut(poolAddr, [{ unit: asset.unit, quantity: deposited.toString() }])
        .txOutInlineDatumValue(buildContributionDatum(subscriberAddr, deposited, "SUBSCRIPTION"))

        .requiredSignerHash(subscriberPkh)

        .txInCollateral(collateral.input.txHash, collateral.input.outputIndex, collateral.output.amount, collateral.output.address)

        .changeAddress(subscriberAddr)
        .selectUtxosFrom(subscriberUtxos)
        .complete();

    return tx.txHex;
}

// ================= SETTLE =================

export async function settle(wallet: any, poolId: string, paymentAssetCode: string, feeAddress: string = FEE_ADDRESS) {

    const addr = await wallet.getChangeAddress();
    const pkh = resolvePaymentKeyHash(addr);

    const provider = new KoiosProvider(NETWORK);
    const utxos = await wallet.getUtxos();

    const asset = assetMap[paymentAssetCode];
    if (!asset) throw new Error("Unsupported asset");

    const {pool, registry} = loadScripts(asset, feeAddress,poolId);

    const poolUtxos = await provider.fetchAddressUTxOs(pool.address);

    if (!poolUtxos.length) throw new Error("No pool UTxOs");

    const collateral = (await wallet.getCollateral())[0];

    const tx = new MeshTxBuilder({
        fetcher: wallet,
        submitter: wallet,
        evaluator: wallet
    }).setNetwork(NETWORK);

    await tx
        .requiredSignerHash(pkh)
        .txInCollateral(collateral.input.txHash, collateral.input.outputIndex, collateral.output.amount, collateral.output.address)
        .changeAddress(addr)
        .selectUtxosFrom(utxos)
        .complete();

    return tx.txHex;
}
