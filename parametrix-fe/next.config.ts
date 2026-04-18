const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
const envFile = process.env.APP_ENV ? `.env.${process.env.APP_ENV}` : ".env";
dotenv.config({
    path: path.resolve(process.cwd(), envFile),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    async redirects() {
        return [
            {
                source: "/(.*)",
                has: [
                    {
                        type: "header",
                        key: "x-forwarded-proto",
                        value: "http",
                    },
                ],
                destination: "https://:host/:path*",
                permanent: true,
            },
        ];
    },

    webpack(config:any) {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };

        // ✅ ADD THIS (important for your error)
        config.module.rules.push({
            test: /\.wasm$/,
            type: "webassembly/async",
        });

        // keep your original rule
        config.module.rules.push({
            test: /\.(js|ts|tsx)$/,
            exclude: [path.resolve(__dirname, "test")],
        });

        return config;
    },

    images: {
        remotePatterns: [
            { protocol: "https", hostname: "imgs.search.brave.com" },
            { protocol: "https", hostname: "t3.ftcdn.net" },
            { protocol: "https", hostname: "media.gettyimages.com" },
            { protocol: "https", hostname: "res.cloudinary.com" },
            { protocol: "https", hostname: "images.unsplash.com" },
        ],
    },

    async headers() {
        return [
            {
                source: "/_next/(.*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;