"use client";

import { useWallet } from "@meshsdk/react";

export function useMeshWallet() {
    const wallet = useWallet();

    return {
        connected: wallet.connected,
        wallet,
    };
}