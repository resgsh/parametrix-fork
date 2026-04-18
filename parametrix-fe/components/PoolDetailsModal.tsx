"use client";

export default function PoolDetailsModal({
                                             open,
                                             onClose,
                                             pool,
                                         }: any) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[500px]">
                <h2 className="text-xl font-bold mb-4">
                    Pool {pool.poolId}
                </h2>

                <pre className="text-xs bg-gray-100 p-3 rounded">
          {JSON.stringify(pool, null, 2)}
        </pre>

                <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-black text-white rounded"
                >
                    Close
                </button>
            </div>
        </div>
    );
}