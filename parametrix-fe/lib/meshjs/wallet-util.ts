import type {UTxO} from "@meshsdk/core";

export async function getWalletInfoForTx(txWallet: any, ) {
    // Attempt to call init() only if the method exists
    if (typeof txWallet.init === "function") {
        try {
            await txWallet.init();
        } catch {
            console.info("Wallet init skipped or not needed.");
        }
    }

    const utxos:UTxO[] = await txWallet?.getUtxos();
    const collateral = await getWalletCollateral(txWallet);
    const walletAddress =  await txWallet.getChangeAddress();
    const changeAddress: string = await txWallet.getChangeAddress();

    if (!utxos || utxos.length === 0) {
        throw new Error("No utxos found");
    }

    if (!collateral) {
        throw new Error("No collateral found");
    }
    if (!walletAddress) {
        throw new Error("No wallet address found");
    }


    return { utxos, collateral, walletAddress, changeAddress };
}

export async function getWalletCollateral(wallet: any): Promise<UTxO | undefined> {
    if (!wallet) return undefined;

    const utxos: UTxO[] = await wallet.getCollateral();
    return utxos[0];
}

