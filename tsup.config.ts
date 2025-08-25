import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  external: [],
  outDir: "dist",
  target: "es2020",
  platform: "neutral",
  keepNames: true,
  treeshake: true,
});
