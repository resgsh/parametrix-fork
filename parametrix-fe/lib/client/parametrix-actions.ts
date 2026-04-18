"use client";

import {createPool, subscribe} from "@/lib/meshjs/parametrix-offchain";

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
    const {
        unsignedTx,
        poolId,
        poolAddress,
        paymentAssetCode,
        feeAddress,
        registryPolicyId,
        tokenNameHex,
        hedgerAddress
    } =
        await createPool(
            wallet,
            params.paymentAssetCode,
            params.eventType,
            params.coverage,
            params.premiumBps,
            params.threshold,
        );

    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    console.log("txHash:", txHash)
    return {
        txHash, poolId, poolAddress,
        paymentAssetCode,
        feeAddress,
        registryPolicyId,
        tokenNameHex,
        hedgerAddress,
    };
}

export async function subscribeContract(
    wallet: any,
    params: {
        poolId: string;
        amount: number;
        paymentAssetCode: string;
        feeAddress?: string;
    }
) {
    const unsignedTx = await subscribe(
        wallet,
        params.poolId,
        params.amount,
        params.paymentAssetCode,
        params.feeAddress
    );
    console.log("unsignedTx:", unsignedTx);

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    console.log("txHash:", txHash);

    return {txHash};
}

import { settle } from "@/lib/meshjs/parametrix-offchain";

export async function settleContract(
    wallet: any,
    params: {
        poolId: string;
        paymentAssetCode: string;
        feeAddress?: string;
    }
) {
    const  unsignedTx = await settle(
        wallet,
        params.poolId,
        params.paymentAssetCode,
        params.feeAddress
    );

    console.log("unsignedTx:", unsignedTx);

    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    console.log("txHash:", txHash);

    return { txHash };
}