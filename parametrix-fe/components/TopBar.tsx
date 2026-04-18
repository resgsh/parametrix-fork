"use client";

import { useState } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import CreatePoolModal from "@/components/CreatePoolModal";

export default function TopBar() {
    const [open, setOpen] = useState(false);
    const { connected } = useWallet();

    return (
        <>
            <div className="sticky top-0 z-50 bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

                    <div className="text-sm font-semibold">
                        Parametrix
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setOpen(true)}
                            disabled={!connected}
                            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                        >
                            Create Pool
                        </button>

                        <CardanoWallet />
                    </div>

                </div>
            </div>

            <CreatePoolModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}