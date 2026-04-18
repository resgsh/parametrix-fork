"use client";

import { createPool } from "@/lib/meshjs/parametrix-offchain";

export async function createPoolContract(
    wallet: any,
    params: {
        eventType: string;
        paymentAssetCode: string;
        feeAddress: string;
    }
) {
    const {unsignedTx, poolId} = await createPool(
        wallet,
        params.paymentAssetCode,
        params.eventType,
        params.feeAddress
    );

    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    return { txHash, poolId };
}