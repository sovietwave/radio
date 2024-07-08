import { defineConfig, Terser } from "vite";

const getTerserOptions = (command: string): Terser.MinifyOptions => {
    if (command === "build") {
        return {
            parse: {
                html5_comments: false,
                shebang: false,
            },
            format: {
                comments: false,
                shebang: false,
            },
            compress: {
                booleans_as_integers: true,
                sequences: 1000000,
                passes: 1000000,
            },
            mangle: {
                properties: {
                    regex: /^_[a-z]/,
                },
            },
        };
    }
};

export default ({ command }) => defineConfig({
    build: {
        minify: "terser",
        terserOptions: getTerserOptions(command),
        assetsInlineLimit: 0,
        assetsDir: "",
        reportCompressedSize: false,
        modulePreload: false,
        rollupOptions: {
            external: ["jquery"],
            output: {
                globals: {
                    jquery: "$",
                },
            },
        },
    },
    server: {
        port: 8080,
        open: true,
    },
    plugins: [
    ],
});