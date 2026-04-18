"use client";

import CustomCardanoWallet from "@/components/ui/custom-wallet";

export default function WalletInlineNotice() {
    return (
        <div className="text-center p-6 bg-white rounded-lg border">
            <p className="mb-4 text-gray-600">
                Connect wallet to create or interact with pools
            </p>
            <CustomCardanoWallet />
        </div>
    );
}