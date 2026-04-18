import "./globals.css";
import Mesh from "@/providers/MeshProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Mesh>
                    {children}
                </Mesh>
            </body>
        </html>
    );
}