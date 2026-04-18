"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useWallet, useWalletList } from "@meshsdk/react";

export default function CustomCardanoWallet() {
    const [modalOpen, setModalOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const wallets = useWalletList();
    const { connect, connected, disconnect, wallet } = useWallet();

    const [address, setAddress] = useState("");
    const networkName = "preprod";

    useEffect(() => {
        const fetchAddress = async () => {
            if (connected && wallet) {
                try {
                    const addr = await wallet.getChangeAddress();
                    setAddress(addr);
                } catch {
                    setAddress("");
                }
            } else {
                setAddress("");
            }
        };
        fetchAddress();
    }, [connected, wallet]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleConnect = async (walletName: string) => {
        try {
            await connect(walletName);
            setModalOpen(false);
        } catch (e) {
            console.error("Wallet connection failed:", e);
        }
    };

    return (
        <div className="inline-block scale-105">

            {/* CONNECTED STATE */}
            {connected ? (
                <div ref={dropdownRef} className="relative w-[240px]">

                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full px-4 py-3 rounded-xl
                       bg-gradient-to-r from-gray-900 to-gray-800
                       border border-gray-700 text-white text-sm
                       shadow-inner"
                    >
                        <div className="flex flex-col items-center">
              <span className="font-semibold tracking-wide">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
                            <span className="text-xs text-blue-400 mt-1">
                {networkName.toUpperCase()}
              </span>
                        </div>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-full bg-[#020617] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(address);
                                    setDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-800 transition"
                            >
                                Copy Address
                            </button>

                            <button
                                onClick={() => {
                                    disconnect();
                                    setDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-800 transition"
                            >
                                Disconnect
                            </button>

                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* CONNECT BUTTON (STRONG VISUAL) */}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="w-[240px] py-4 text-base font-semibold rounded-xl
                       bg-gradient-to-r from-blue-600 to-purple-600 text-white
                       shadow-[0_10px_30px_rgba(59,130,246,0.5)]
                       hover:scale-[1.03]
                       hover:shadow-[0_15px_40px_rgba(139,92,246,0.7)]
                       transition-all duration-200"
                    >
                        Connect Wallet
                    </button>

                    {/* MODAL */}
                    {modalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-end">

                            {/* overlay */}
                            <div
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                                onClick={() => setModalOpen(false)}
                            />

                            {/* side panel */}
                            <div
                                className="relative w-[380px] h-full p-6
                           bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617]
                           text-white border-l border-gray-800 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >

                                <h2 className="text-xl font-semibold mb-6">
                                    Select Wallet
                                </h2>

                                <div className="space-y-3 mb-6">
                                    {wallets.map((w) => (
                                        <button
                                            key={w.name}
                                            onClick={() => handleConnect(w.name)}
                                            className="flex items-center w-full p-3 rounded-xl
                                 bg-gradient-to-r from-gray-900 to-gray-800
                                 border border-gray-800
                                 hover:from-blue-600/20 hover:to-purple-600/20
                                 hover:border-blue-500/40
                                 transition-all"
                                        >
                                            <img src={w.icon} className="w-6 h-6 mr-3" />
                                            <span className="text-sm font-medium">{w.name}</span>
                                        </button>
                                    ))}
                                </div>

                                <p className="text-xs text-gray-400">
                                    By connecting, you agree to{" "}
                                    <Link href="/terms-of-use" className="text-blue-400 hover:underline">
                                        Terms
                                    </Link>{" "}
                                    and{" "}
                                    <Link href="/privacy-policy" className="text-blue-400 hover:underline">
                                        Privacy
                                    </Link>.
                                </p>

                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="mt-6 w-full py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
                                >
                                    Cancel
                                </button>

                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}