"use client";

import { useState } from "react";

export default function OracleRefresh() {
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<null | {
        tx_id: string;
        median: number;
        signatures: number;
        submitted: boolean;
    }>(null);
    const [err, setErr] = useState<string | null>(null);

    async function handleRefresh() {
        try {
            setLoading(true);
            setErr(null);
            setRes(null);

            const r = await fetch("/api/oracle", { method: "POST" })

            if (!r.ok) throw new Error(`HTTP ${r.status}`);

            const data = await r.json();
            setRes(data);
        } catch (e: any) {
            setErr(e.message || "Failed to refresh oracle");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="w-full py-10">
            <div className="max-w-6xl mx-auto px-6">

                {/* CTA */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Oracle Update</h3>
                        <p className="text-sm text-gray-600">
                            Fetch latest aggregated value and submit on-chain.
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-6 py-3 text-sm font-semibold rounded-lg
                       bg-gradient-to-r from-indigo-600 to-blue-600 text-white
                       shadow-md hover:scale-[1.02] transition
                       disabled:opacity-40"
                    >
                        {loading ? "Updating..." : "Refresh Oracle"}
                    </button>
                </div>

                {/* Response */}
                {res && (
                    <div className="mt-6 p-5 rounded-xl border border-green-200 bg-green-50 text-sm">
                        <div className="font-medium text-green-800 mb-4">Oracle Updated</div>

                        <div className="space-y-4">

                            {/* TX ID full width */}
                            <div>
                                <div className="text-gray-600 mb-1">Tx ID</div>
                                <div className="font-mono text-xs break-all bg-white border border-gray-200 rounded-md p-3">
                                    {res.tx_id}
                                </div>
                            </div>

                            {/* rest grid */}
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-gray-600 text-xs">Median</div>
                                    <div className="font-medium">{res.median}</div>
                                </div>

                                <div>
                                    <div className="text-gray-600 text-xs">Signatures</div>
                                    <div className="font-medium">{res.signatures}</div>
                                </div>

                                <div>
                                    <div className="text-gray-600 text-xs">Submitted</div>
                                    <div className="font-medium">
                                        {res.submitted ? "Yes" : "No"}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Error */}
                {err && (
                    <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                        {err}
                    </div>
                )}

            </div>
        </section>
    );
}