"use client";

import { useEffect, useState } from "react";
import PoolCard from "./PoolCard";

export default function PoolGrid() {
    const [pools, setPools] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/pools")
            .then((res) => res.json())
            .then(setPools);
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ">
            {pools.map((pool) => (
                <PoolCard key={pool.poolId} pool={pool} />
            ))}
        </div>
    );
}