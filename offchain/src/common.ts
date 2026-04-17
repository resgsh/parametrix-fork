import {BlockfrostProvider,} from "@meshsdk/core";
import dotenv from "dotenv";

dotenv.config({path: ".env.test"});

export const blockfrost_api_key = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "";
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
