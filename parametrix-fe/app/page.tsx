"use client";

import Hero from "@/components/Hero";
import PoolGrid from "@/components/PoolGrid";
import HeroSectionWrapper from "@/components/HeroSectionWrapper";

export default function Home() {
    return (
        <main className="bg-[#F5F5F2] text-gray-900 min-h-screen">
            <HeroSectionWrapper>
                <Hero />
            </HeroSectionWrapper>


            <section className="relative py-16 bg-gradient-to-br from-[#ffffff] via-[#eef2ff] to-[#e0f2fe]">

                {/* bold accent sweep */}
                <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_40%)]" />
                <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.25),transparent_40%)]" />

                {/* subtle diagonal energy */}
                <div className="absolute inset-0 opacity-[0.08]"
                     style={{
                         backgroundImage:
                             "linear-gradient(120deg, black 1px, transparent 1px)",
                         backgroundSize: "120px 120px",
                     }}
                />

                <div className="relative w-[90%] mx-auto px-6">
                    <h2 className="text-xl font-semibold mb-8 text-gray-900">
                        Pools
                    </h2>

                    <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                        <PoolGrid />
                    </div>
                </div>

            </section>
        </main>
    );
}