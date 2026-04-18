"use client";
import "./globals.css";
import Mesh from "@/providers/MeshProvider";

// app/layout.tsx
import { Source_Sans_3 } from "next/font/google";

const font = Source_Sans_3({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={font.className}>
            <body>
                <Mesh>
                    {children}
                </Mesh>
            </body>
        </html>
    );
}