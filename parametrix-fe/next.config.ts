import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,

    webpack(config) {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };

        // WASM support (Mesh)
        config.module.rules.push({
            test: /\.wasm$/,
            type: "webassembly/async",
        });

        return config;
    },
};

export default nextConfig;