"use client";

import {useState} from "react";
import {useWallet} from "@meshsdk/react";
import {createPoolContract} from "@/lib/client/parametrix-actions";

/* ---------- TYPES ---------- */
type RiskType = "RAINFALL_EXCEEDED" | "FLIGHT_DELAY";

/* ---------- CONFIG ---------- */
const CONFIG: {
    riskEvents: { label: string; value: RiskType }[];
    coverage: number[];
    premiumBps: { label: string; value: number }[];
    locations: Record<RiskType, { label: string; value: string }[]>;
} = {
    riskEvents: [
        {label: "Rainfall Exceeds Threshold", value: "RAINFALL_EXCEEDED"},
        //{label: "Flight Delay", value: "FLIGHT_DELAY"},
    ],
    coverage: [250, 500, 1000],
    premiumBps: [
        {label: "5%", value: 500},
        {label: "10%", value: 1000},
    ],
    locations: {
        RAINFALL_EXCEEDED: [
            {label: "Mumbai, India", value: "MUMBAI_IN"},
            {label: "Chennai, India", value: "CHENNAI_IN"},
            {label: "Jakarta, Indonesia", value: "JAKARTA_ID"},
        ],
        FLIGHT_DELAY: [
            {label: "London, UK (Heathrow)", value: "LONDON_UK"},
            {label: "New York, USA (JFK)", value: "NYC_US"},
            {label: "Dubai, UAE", value: "DUBAI_UAE"},
        ],
    },
};

/* ---------- STORIES ---------- */
const STORIES: Record<RiskType, string> = {
    RAINFALL_EXCEEDED:
        "I am a crop farmer and my harvest season is approaching. Excess rainfall can damage yield and impact income. I am seeking protection against heavy rainfall during this period.",
    FLIGHT_DELAY:
        "I frequently travel for work and delays can disrupt schedules and cause financial loss. I want protection in case my flight is delayed beyond a certain threshold.",
};
type Props = {
    open: boolean;
    onClose: () => void;
};

export default function CreatePoolModal({open, onClose}: Props) {
    const {wallet, connected} = useWallet();

    /* ---------- STATE (INSIDE COMPONENT) ---------- */
    const [loading, setLoading] = useState(false);

    const [risk, setRisk] = useState<RiskType>("RAINFALL_EXCEEDED");

    const [coverage, setCoverage] = useState(250);
    const [premium, setPremium] = useState(500);
    const [asset] = useState("DJED");

    const [location, setLocation] = useState(
        CONFIG.locations["RAINFALL_EXCEEDED"][0].value
    );

    if (!open) return null;

    const threshold = risk === "RAINFALL_EXCEEDED" ? 100 : 6000000;
    const story = STORIES[risk];

    const locationLabel =
        CONFIG.locations[risk].find((l) => l.value === location)?.label;

    /* ---------- TIME ---------- */
    const now = new Date();

    let subscriptionEnd: Date;
    let eventTime: Date;
    let settlementTime: Date;

    if (risk === "RAINFALL_EXCEEDED") {
        subscriptionEnd = new Date(now);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

        eventTime = new Date(now);
        eventTime.setMonth(eventTime.getMonth() + 3);

        settlementTime = new Date(eventTime.getTime() + 6 * 60 * 60 * 1000);
    } else {
        subscriptionEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        eventTime = new Date(now);
        eventTime.setDate(eventTime.getDate() + 7);

        settlementTime = new Date(eventTime.getTime() + 15 * 60 * 1000);
    }

    const fmt = (d: Date) =>
        d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    /* ---------- CREATE ---------- */
    async function handleCreate() {
        if (!connected || !wallet) return;

        try {
            setLoading(true);

            const res = await createPoolContract(wallet, {
                eventType: risk,
                paymentAssetCode: asset,
                coverage,
                premiumBps: premium,
                threshold,
            });

            await fetch("/api/pools", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    ...res,
                    createdAt: Date.now(),
                    config: {
                        risk,
                        coverage,
                        premium,
                        threshold,
                        location,
                        story,
                        startTime: now.getTime(),
                        subscriptionEnd: subscriptionEnd.getTime(),
                        eventTime: eventTime.getTime(),
                        settlementTime: settlementTime.getTime(),
                    },
                }),
            });

            onClose();
            window.location.reload();
        } finally {
            setLoading(false);
        }
    }

    const preview = `${risk.replace("_", " ")} @ ${locationLabel}, ${coverage} ${asset}, Premium ${
        premium / 100
    }%`;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-4">

                {/* overlay */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* modal */}
                <div className="relative w-[92%] max-w-4xl
          bg-gradient-to-b from-[#f9fafb] via-[#eef2f7] to-[#e5e7eb]
          text-gray-900 rounded-2xl p-6
          border border-gray-300 shadow-2xl">

                    {/* HEADER */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold">Create Risk Pool</h2>
                        <p className="text-gray-600 text-sm mt-1">
                            Hedger defines protection terms. Subscribers provide liquidity and earn yield.
                        </p>
                    </div>

                    {/* TOP */}
                    <div className="mb-6 grid md:grid-cols-2 gap-5">

                        <div>
                            <label className="font-medium mb-1 block">Risk Event</label>
                            <select
                                value={risk}
                                onChange={(e) => {
                                    const newRisk = e.target.value as RiskType;
                                    setRisk(newRisk);
                                    setLocation(CONFIG.locations[newRisk][0].value);
                                }}
                                className="w-full p-3 rounded-md bg-white border border-gray-300"
                            >
                                {CONFIG.riskEvents.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="p-3 rounded-md border border-gray-300 bg-white">
                            <div className="text-xs text-gray-500 mb-1">Hedger Intent</div>
                            <div className="text-sm text-gray-800">{story}</div>
                        </div>

                    </div>

                    {/* GRID */}
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* LEFT */}
                        <div className="space-y-5">

                            <div>
                                <label className="font-medium mb-1 block">Location</label>
                                <select
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full p-3 rounded-md bg-white border border-gray-300"
                                >
                                    {CONFIG.locations[risk].map((l) => (
                                        <option key={l.value} value={l.value}>
                                            {l.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-medium mb-1 block">Threshold</label>
                                <div className="p-3 bg-white border border-gray-300 rounded-md">
                                    {threshold}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT */}
                        <div className="space-y-5">

                            <div>
                                <label className="font-medium mb-1 block">Coverage</label>
                                <select
                                    value={coverage}
                                    onChange={(e) => setCoverage(Number(e.target.value))}
                                    className="w-full p-3 rounded-md bg-white border"
                                >
                                    {CONFIG.coverage.map((c) => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-medium mb-1 block">Premium (%)</label>
                                <select
                                    value={premium}
                                    onChange={(e) => setPremium(Number(e.target.value))}
                                    className="w-full p-3 rounded-md bg-white border"
                                >
                                    {CONFIG.premiumBps.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* TIMING */}
                    <div className="mt-6">
                        <label className="font-medium mb-1 block">Pool Lifecycle</label>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">

                            <div className="p-3 bg-white border border-gray-300 rounded-md">
                                <div className="text-gray-500 text-xs">Start</div>
                                <div className="font-medium">{fmt(now)}</div>
                            </div>

                            <div className="p-3 bg-white border border-gray-300 rounded-md">
                                <div className="text-gray-500 text-xs">Subscription Ends</div>
                                <div className="font-medium">{fmt(subscriptionEnd)}</div>
                            </div>

                            <div className="p-3 bg-white border border-gray-300 rounded-md">
                                <div className="text-gray-500 text-xs">Event Time</div>
                                <div className="font-medium">{fmt(eventTime)}</div>
                            </div>

                            <div className="p-3 bg-white border border-gray-300 rounded-md">
                                <div className="text-gray-500 text-xs">Settlement</div>
                                <div className="font-medium">{fmt(settlementTime)}</div>
                            </div>

                        </div>

                        <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-normal text-gray-900">
                            <span className="font-bold">Demo Mode:</span>{" "}
                            The dates shown reflect realistic timelines for this type of risk
                            (e.g. seasonal rainfall or scheduled flights).
                            However, for demonstration purposes, protocol actions such as
                            subscription and settlement are not time-restricted here —
                            you can interact with the pool immediately to experience the full lifecycle.
                        </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="mt-6 p-4 rounded-md border bg-blue-50">
                        <div className="font-medium text-sm">{preview}</div>
                    </div>

                    {/* CTA */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-300 rounded-lg bg-white"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleCreate}
                            disabled={!connected || loading}
                            className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
                        >
                            {loading ? "Creating..." : "Create Pool"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}