"use client";

import { useState } from "react";
import { useWallet } from "@meshsdk/react";
import { createPoolContract } from "@/lib/client/parametrix-actions";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CreatePoolModal({ open, onClose }: Props) {
    const { wallet, connected } = useWallet();
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    async function handleCreate() {
        if (!connected || !wallet) return;

        try {
            setLoading(true);

            const { txHash, poolId } = await createPoolContract(wallet, {
                eventType: "RAINFALL_EXCEEDED",
                paymentAssetCode: "DJED",
                feeAddress: "<HARDCODED_FEE_ADDR>",
            });

            await fetch("/api/pools", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    poolId,
                    txHash,
                    createdAt: Date.now(),
                }),
            });

            onClose();
        } catch (e) {
            console.error("Create pool failed:", e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

            {/* overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* modal */}
            <div className="relative w-[90%] max-w-md bg-[#020617] text-white rounded-2xl p-8 border border-gray-800 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">

                {/* header */}
                <h2 className="text-xl font-semibold mb-6">
                    Create Pool
                </h2>

                {/* action */}
                <button
                    onClick={handleCreate}
                    disabled={loading || !connected}
                    className="w-full py-3 text-base font-semibold bg-blue-600 rounded-lg
                   shadow-[0_0_20px_rgba(59,130,246,0.5)]
                   hover:shadow-[0_0_35px_rgba(59,130,246,0.8)]
                   hover:bg-blue-500 transition disabled:opacity-40"
                >
                    {loading ? "Creating..." : "Create & Sign Transaction"}
                </button>

                {/* cancel */}
                <button
                    onClick={onClose}
                    className="mt-4 w-full py-3 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
                >
                    Cancel
                </button>

            </div>
        </div>
    );
}