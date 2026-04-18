import { BlockfrostProvider } from "@meshsdk/core";
import { FALLBACK_BLOCKFROST_KEY } from "./blockchainProvider.ts";

const apiKey =
    Deno.env.get("NEXT_PUBLIC_BLOCKFROST_API_KEY") ||
    FALLBACK_BLOCKFROST_KEY;

export const blockchainProvider = new BlockfrostProvider(apiKey);

export async function getAddressUtxos({
                                          scriptAddress,
                                          asset,
                                      }: {
    scriptAddress: string;
    asset: string;
}) {
    //const blockchainProvider = getProvider();
    const utxos = await blockchainProvider.fetchAddressUTxOs(
        scriptAddress,
        asset,
    );

    return utxos;
}
