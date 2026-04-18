"use client";

import { CardanoWallet, useWallet } from "@meshsdk/react";
import { useState } from "react";
import CreatePoolModal from "@/components/CreatePoolModal";

export default function StickyHeader() {
    const [open, setOpen] = useState(false);
    const { connected } = useWallet();

    return (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <h1 className="font-bold text-lg">Parametrix</h1>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                        disabled={!connected}
                    >
                        Create Pool
                    </button>

                    <CardanoWallet />
                </div>
            </div>

            <CreatePoolModal open={open} onClose={() => setOpen(false)} />
        </div>
    );
}