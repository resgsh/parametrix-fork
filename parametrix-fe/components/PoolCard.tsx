"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import PoolDetailsModal from "./PoolDetailsModal";

export default function PoolCard({ pool }: { pool: any }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <motion.div
                whileHover={{ y: -5 }}
                className="bg-[#11161D] border border-gray-800 rounded-xl p-5 hover:border-gray-600"
                onClick={() => setOpen(true)}
            >
                <h3 className="font-semibold text-lg mb-2">
                    Pool #{pool.poolId}
                </h3>

                <p className="text-sm text-gray-500">
                    Created: {new Date(pool.createdAt).toLocaleString()}
                </p>

                <div className="mt-4 text-xs text-gray-400">
                    Tx: {pool.txHash?.slice(0, 10)}...
                </div>
            </motion.div>

            <PoolDetailsModal
                open={open}
                onClose={() => setOpen(false)}
                pool={pool}
            />
        </>
    );
}