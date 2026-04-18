"use client";

import { createPool } from "@/lib/meshjs/parametrix-offchain";

export async function createPoolContract(
    wallet: any,
    params: {
        eventType: string;
        paymentAssetCode: string;
        coverage: number;
        premiumBps: number;
        threshold: number;
        feeAddress?: string;
    }
) {
    const { unsignedTx, poolId } = await createPool(
        wallet,
        params.paymentAssetCode,
        params.eventType,
            params.coverage,
            params.premiumBps,
            params.threshold,

    );

    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    return { txHash, poolId };
}