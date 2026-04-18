"use client";

import { useState } from "react";
import { useWallet } from "@meshsdk/react";
import { createPoolContract } from "@/lib/client/parametrix-actions";

/* ---------- CONFIG ---------- */
const CONFIG = {
    riskEvents: [
        { label: "Rainfall Exceeds Threshold", value: "RAINFALL_EXCEEDED" },
        { label: "Flight Delay", value: "FLIGHT_DELAY" },
    ],
    coverage: [250, 500, 1000],
    premiumBps: [
        { label: "5%", value: 500 },
        { label: "10%", value: 1000 },
    ],
    assets: [
        { label: "DJED", value: "DJED", enabled: true },
        { label: "USDM", value: "USDM", enabled: false },
        { label: "ADA", value: "ADA", enabled: false },
        { label: "USDC", value: "USDC", enabled: false },
    ],
};

export default function CreatePoolModal({ open, onClose }: any) {
    const { wallet, connected } = useWallet();
    const [loading, setLoading] = useState(false);

    const [risk, setRisk] = useState(CONFIG.riskEvents[0].value);
    const [coverage, setCoverage] = useState(250);
    const [premium, setPremium] = useState(500);
    const [asset, setAsset] = useState("DJED");

    if (!open) return null;

    const threshold = risk === "RAINFALL_EXCEEDED" ? 100 : 6000000;

    async function handleCreate() {
        if (!connected || !wallet) return;

        try {
            setLoading(true);

            const { txHash, poolId } = await createPoolContract(wallet, {
                eventType: risk,
                paymentAssetCode: asset,
                coverage,
                premiumBps: premium,
                threshold,
            });

            await fetch("/api/pools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    poolId,
                    txHash,
                    createdAt: Date.now(),
                    config: { risk, coverage, premium, asset, threshold },
                }),
            });

            onClose();
            window.location.reload();
        } finally {
            setLoading(false);
        }
    }

    const preview = `${risk.replace("_", " ")} > ${threshold}, ${coverage} ${asset}, Premium ${premium / 100}%`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* modal */}
            <div className="relative w-[92%] max-w-4xl min-h-[85vh]
                      bg-gradient-to-b from-[#f9fafb] via-[#eef2f7] to-[#e5e7eb]
                      text-gray-900 rounded-2xl p-10
                      border border-gray-300 shadow-2xl overflow-y-auto">

                {/* HEADER */}
                <div className="mb-8">
                    <h2 className="text-3xl font-semibold">Create Risk Pool</h2>
                    <p className="text-gray-600 mt-2 max-w-2xl">
                        Hedger defines protection terms and pays premium.
                        Subscribers provide liquidity and earn yield unless the event triggers a payout.
                    </p>
                </div>

                {/* FLOW EXPLAINER */}
                <div className="mb-10 p-4 rounded-lg border border-gray-300 bg-white text-sm">
                    <span className="font-medium">Flow:</span>{" "}
                    Hedger pays premium → Subscribers provide capital →
                    If event occurs, Subscribers pay Hedger
                </div>

                {/* GRID */}
                <div className="grid md:grid-cols-2 gap-10">

                    {/* LEFT COLUMN */}
                    <div className="space-y-8">

                        {/* Risk */}
                        <div>
                            <label className="font-medium">Risk Event</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Condition monitored by oracle.
                            </p>
                            <select
                                value={risk}
                                onChange={(e) => setRisk(e.target.value)}
                                className="w-full p-4 rounded-lg bg-white border border-gray-300"
                            >
                                {CONFIG.riskEvents.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Threshold */}
                        <div>
                            <label className="font-medium">Threshold</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Trigger value for payout.
                            </p>
                            <div className="p-4 bg-white border border-gray-300 rounded-lg">
                                {threshold}
                            </div>
                        </div>

                        {/* Timing */}
                        <div>
                            <label className="font-medium">Timing</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Preset for demo.
                            </p>
                            <div className="p-4 bg-white border border-gray-300 rounded-lg text-sm">
                                Start: Now <br />
                                End: +24h <br />
                                Event: +5 min <br />
                                Settlement: Set to 'Now' for demo
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">

                        {/* Coverage */}
                        <div>
                            <label className="font-medium">Coverage (Payout)</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Amount Hedger receives if event occurs.
                            </p>
                            <select
                                value={coverage}
                                onChange={(e) => setCoverage(Number(e.target.value))}
                                className="w-full p-4 rounded-lg bg-white border border-gray-300"
                            >
                                {CONFIG.coverage.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Premium */}
                        <div>
                            <label className="font-medium">Premium (%)</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Paid by Hedger → earned by Subscribers.
                            </p>
                            <select
                                value={premium}
                                onChange={(e) => setPremium(Number(e.target.value))}
                                className="w-full p-4 rounded-lg bg-white border border-gray-300"
                            >
                                {CONFIG.premiumBps.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Asset */}
                        <div>
                            <label className="font-medium">Asset</label>
                            <p className="text-sm text-gray-500 mb-2">
                                Settlement currency (demo restricted).
                            </p>
                            <select
                                value={asset}
                                className="w-full p-4 rounded-lg bg-white border border-gray-300"
                            >
                                {CONFIG.assets.map((a) => (
                                    <option key={a.value} value={a.value} disabled={!a.enabled}>
                                        {a.label} {!a.enabled ? "(disabled)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                </div>

                {/* PREVIEW */}
                <div className="mt-10 p-5 rounded-lg border border-blue-200 bg-blue-50">
                    <div className="text-sm text-gray-700 mb-1">Pool Summary</div>
                    <div className="font-medium">{preview}</div>
                </div>

                {/* CTA */}
                <div className="mt-10 flex gap-4">

                    {/* Cancel — secondary / low emphasis */}
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-base font-medium rounded-xl
               border border-gray-300
               bg-white text-gray-600
               hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>

                    {/* Create — primary / dominant */}
                    <button
                        onClick={handleCreate}
                        disabled={!connected || loading}
                        className="flex-[2] py-5 text-lg font-semibold rounded-xl
               bg-gradient-to-r from-blue-600 to-indigo-600 text-white
               shadow-[0_10px_30px_rgba(59,130,246,0.4)]
               hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(99,102,241,0.6)]
               transition-all
               disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating..." : "Create Pool"}
                    </button>

                </div>
            </div>
        </div>
    );
}