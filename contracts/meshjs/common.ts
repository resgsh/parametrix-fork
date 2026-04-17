import {BlockfrostProvider,} from "@meshsdk/core";


export const blockfrost_api_key = Deno.env.get("NEXT_PUBLIC_BLOCKFROST_API_KEY") ?? "";
export const blockchainProvider = new BlockfrostProvider(blockfrost_api_key);


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
