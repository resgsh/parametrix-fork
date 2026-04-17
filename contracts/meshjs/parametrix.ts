import {
  applyParamsToScript,
  deserializeAddress,
  resolveScriptHash,
  KoiosProvider,
  mAssetClass,
  mConStr0,
  MeshTxBuilder,
  MeshWallet,
  mPubKeyAddress,
  pubKeyAddress,
  resolvePaymentKeyHash,
  serializePlutusScript,
  stringToHex,
} from "@meshsdk/core";
import {assetClass} from "@meshsdk/common";
import blueprint from "../aiken/parametrix/plutus.json" with {type: "json"};

import {getAddressUtxos} from "./common.ts";


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const NETWORK = 'preprod';
const NETWORK_ID = 0;
const MICRO_UNITS = 1000000
const FEE_ADDRESS = "addr_test1qrxyezc0h7pzg3uv83v30ttmec4navpw8u5q5ft3w72ysvae7m8kn49reh566kzdzjtt0rwxfdj39gvm54z5z7tn4lrsqneynj"
const COVERAGE = 100 * MICRO_UNITS;
const PREMIUM_BPS = 500;


function getScriptAddress(compiled: string): string {
  const { address } = serializePlutusScript(
      { code: compiled, version: "V3" },
      undefined,
      NETWORK_ID
  );
  return address;
}

function loadWallet(walletFile: string): MeshWallet {
  const mnemonic = JSON.parse(Deno.readTextFileSync(walletFile));
  const provider = new KoiosProvider(NETWORK);

  return new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: 'mnemonic', words: mnemonic }
  });
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


export const assetMap: Record<
    string,
    { policyId: string; assetNameHex: string; unit: string }
> = {
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


// --------------------------------------------------
// FIXED REGISTRY LOADER
// --------------------------------------------------

function buildPubKeyAddress(feeAddrBech32: string) {
  return pubKeyAddress(deserializeAddress(feeAddrBech32).pubKeyHash, deserializeAddress(feeAddrBech32).stakeCredentialHash);
}
function buildMPubKeyAddress(bech32Address: string) {
  return mPubKeyAddress(deserializeAddress(bech32Address).pubKeyHash, deserializeAddress(bech32Address).stakeCredentialHash)
}

function loadScripts(
    asset: { policyId: string; assetNameHex: string },
    feeAddrBech32: string
) {
  // ---------------- REGISTRY (mint policy) ----------------
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

  // ---------------- PARAMETRIX (pool validator) ----------------
  const poolCompiled = getValidator("parametrix."); // adjust if name differs

  const poolAddress = getScriptAddress(poolCompiled);

  return {
    registry: {
      script: registryScript,
      address: getScriptAddress(registryScript),
      policyId: resolveScriptHash(registryScript, 'V3')
    },

    pool: {
      script: poolCompiled,
      address: poolAddress,
    },
  };
}
// --------------------------------------------------
// DATUM (STRICT ORDER)
// --------------------------------------------------
function buildPoolDatum(
    poolId: string,
    asset: { policyId: string; assetNameHex: string },
    hedgerAddr: string,
    poolAddr: string,
    feeAddr: string,
) {

  return mConStr0([
    poolId,                              // pool_id (ByteArray)
    mAssetClass(asset.policyId, asset.assetNameHex), // payment_asset
    buildMPubKeyAddress(hedgerAddr),           // hedger

    "RAINFALL_EXCEEDED",                 // event_type
    100,                                 // event_threshold
    COVERAGE,                  // coverage_target
    500,                                 // premium_bps

    Date.now(),                          // subscription_start
    Date.now() + 600000,                 // subscription_end
    Date.now() + 12000,                // event_time -
    Date.now() + 18000,                // settlement_time

    buildMPubKeyAddress(poolAddr),              // fee_addr
    buildMPubKeyAddress(feeAddr),              // fee_addr
    500,                                 // fee__bps
  ]);
}

function buildContributionDatum(
    ownerAddr: string,
    amount: number,
    amount_type: string
) {
  return mConStr0([
    buildMPubKeyAddress(ownerAddr),   // owner
    amount,                     // amount
    amount_type,           // amount_type (ByteArray)
  ]);
}


// --------------------------------------------------
// CREATE POOL (MINT)
// --------------------------------------------------

export async function createPool(
    walletFile: string,
    paymentAssetCode: string,
    feeAddress: string = FEE_ADDRESS
) {


  const wallet = loadWallet(walletFile);
  const changeAddress = await wallet.getChangeAddress();
  const hedgerPkh = resolvePaymentKeyHash(changeAddress);
  const poolId = `${hedgerPkh.slice(0, 3)}-${Date.now()}`; //fine for demo


  const provider = new KoiosProvider(NETWORK);
  const utxos = await provider.fetchAddressUTxOs(changeAddress);
  if (!utxos.length) throw new Error('No wallet UTxOs');

  console.dir(utxos, { depth: null });
  const asset = assetMap[paymentAssetCode];
  if (!asset) throw new Error("Unsupported asset");

  const { registry, pool } = loadScripts(asset, feeAddress);
  const collateral = (await wallet.getCollateral())[0];

  // ---------------- DATUM ----------------
  const datum = buildPoolDatum(
    poolId,
    asset,
    changeAddress,
    pool.address,
    feeAddress,
  );

  // ---------------- PREMIUM ----------------

  const premium_micro_units =
      (COVERAGE * PREMIUM_BPS) / 10_000;

  console.log("premium:", premium_micro_units)
  // ---------------- TX ----------------
  const tx = new MeshTxBuilder({}).setNetwork(NETWORK);

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
      .txOutInlineDatumValue(
          buildContributionDatum(
              changeAddress,
              premium_micro_units,
              "PREMIUM"
          ))

      .requiredSignerHash(hedgerPkh)

      .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address
      )

      .changeAddress(changeAddress)
      .selectUtxosFrom(utxos)
      .complete();

  const signed = await wallet.signTx(tx.txHex, true);
  const txHash = await wallet.submitTx(signed);

  console.log("\n=== POOL CREATED ===");

  console.log("Tx Hash:", txHash);
  console.log("Pool ID:", poolId);

  console.log("Pool Address:", pool.address);
  console.log("Payment Asset:", paymentAssetCode);

  console.log("Coverage:", COVERAGE);
  console.log("Premium (bps):", PREMIUM_BPS);
  console.log("Premium Amount:", premium_micro_units);

  console.log("====================\n");
}


// --------------------------------------------------
// CLI
// --------------------------------------------------

if (import.meta.main) {
  const [cmd, wallet, asset] = Deno.args;

  const run = async () => {
    switch (cmd) {
      case "create":
        await createPool(wallet, asset);
        break;

      default:
        console.log(`
Usage:
  deno run -A parametrix.ts create <wallet.json> DJED
`);
    }
  };

  run();
}