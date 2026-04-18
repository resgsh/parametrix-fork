"use client";

import { useState } from "react";
import { useWallet } from "@meshsdk/react";
import {settleContract, subscribeContract} from "@/lib/client/parametrix-actions";

export default function PoolDetailsModal({
                                             open,
                                             onClose,
                                             pool,
                                         }: any) {
    const { wallet, connected } = useWallet();

    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleSubscribe = async () => {
        if (!connected || !wallet) {
            console.error("Wallet not connected");
            return;
        }

        if (!amount || Number(amount) <= 0) {
            console.error("Invalid amount");
            return;
        }

        try {
            setLoading(true);

            const { txHash } = await subscribeContract(wallet, {
                poolId: pool.poolId,
                amount: Number(amount),
                paymentAssetCode: pool.payment_asset_code || "DJED",
            });

            console.log("Subscribed:", txHash);
            setAmount("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async () => {
        try {
            if (!wallet) {
                console.error("Wallet not connected");
                return;
            }

            const { txHash } = await settleContract(wallet, {
                poolId: pool.poolId,
                paymentAssetCode: pool.payment_asset_code || "ADA",
            });

            console.log("Settled:", txHash);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[500px]">
                <h2 className="text-xl font-bold mb-4">
                    Pool {pool.poolId}
                </h2>

                <pre className="text-xs bg-gray-100 p-3 rounded max-h-[300px] overflow-auto">
                    {JSON.stringify(pool, null, 2)}
                </pre>

                {/* Amount input */}
                <div className="mt-4">
                    <input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                    />
                </div>

                {/* Buttons */}
                <div className="mt-4 flex gap-3 justify-end">
                    <button
                        onClick={handleSubscribe}
                        disabled={loading || !connected}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Subscribe"}
                    </button>

                    <button
                        onClick={handleSettle}
                        className="px-4 py-2 bg-green-600 text-white rounded"
                    >
                        Settle
                    </button>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}