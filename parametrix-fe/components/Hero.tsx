"use client";

import { useState } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import CreatePoolModal from "@/components/CreatePoolModal";

export default function Hero() {
    const { connected } = useWallet();
    const [open, setOpen] = useState(false);

    return (
        <>
            <section className="pt-10 pb-6">
                <div className="w-[90%] max-w-[1800px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* LEFT: CONTENT (2/3) */}
                    <div className="lg:col-span-2 bg-[#0F172A]/80 backdrop-blur text-white rounded-2xl p-10 shadow-sm">

                        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                            Parametrix
                        </h1>

                        <p className="text-lg text-gray-300 mb-6 max-w-2xl">
                            Parametrix is a decentralized RealFi protocol for <span className="text-white font-semibold">parametric event risk coverage</span>,
                            where payouts are triggered automatically by real-world data — no claims, no disputes, no delays.
                        </p>

                        <p className="text-gray-400 mb-8 max-w-2xl">
                            It transforms measurable events like rainfall or delays into
                            <span className="text-gray-200"> on-chain financial agreements</span>,
                            powered by oracle data and executed trustlessly.
                        </p>

                        {/* HOW IT WORKS */}
                        <div className="grid sm:grid-cols-2 gap-8 text-sm">

                            <div>
                                <h3 className="text-white font-semibold mb-3">How it works</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li>• Risk pools tied to real-world events</li>
                                    <li>• Subscribers pay premium for coverage</li>
                                    <li>• Hedgers earn yield if event doesn’t occur</li>
                                    <li>• Oracle triggers automatic settlement</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold mb-3">Why it matters</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li>• No claims process</li>
                                    <li>• Fully on-chain + verifiable</li>
                                    <li>• Programmable risk markets</li>
                                    <li>• Real-world applications</li>
                                </ul>
                            </div>

                        </div>

                        {/* TAGLINE */}
                        <div className="mt-8 text-sm text-gray-500 italic">
                            Trustless, oracle-driven insurance-like markets — powered by data.
                        </div>

                    </div>

                    {/* RIGHT: ACTION PANEL (1/3) */}
                    <div className="bg-[#0F172A] text-white rounded-2xl p-8 flex flex-col justify-center items-center gap-6">

                        <div className="text-center">
                            <p className="text-sm text-gray-400 mb-2">Get Started</p>
                            <p className="text-lg font-semibold">
                                Connect your wallet
                            </p>
                        </div>

                        <div className="scale-200 origin-center">
                            <CardanoWallet isDark />
                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            disabled={!connected}
                            className="w-full py-5 text-lg font-semibold rounded-xl
             bg-gradient-to-r from-blue-600 to-blue-500 text-white
             shadow-[0_10px_30px_rgba(59,130,246,0.5)]
             hover:from-blue-500 hover:to-blue-400
             hover:scale-[1.02]
             hover:shadow-[0_15px_40px_rgba(59,130,246,0.7)]
             transition-all duration-200
             disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Create Pool
                        </button>

                        {!connected && (
                            <p className="text-xs text-gray-500 text-center">
                                Connect wallet to create and interact with pools
                            </p>
                        )}
                    </div>

                </div>
            </section>

            <CreatePoolModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}