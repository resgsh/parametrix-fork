"use client";
export default function HeroSectionWrapper({
                                               children,
                                           }: {
    children: React.ReactNode;
}) {
    return (
        <section className="relative overflow-hidden py-10 bg-[#1E293B]">

            {/* animated layer */}
            <div className="absolute inset-0 -z-10">

                {/* gradient depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A]" />

                {/* glow accents (more visible now) */}
                <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl animate-float" />

                {/* grid (clearer now) */}
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            <div className="relative z-10">
                {children}
            </div>
        </section>
    );
}