//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: ".",
  esbuild: {
    options: {
      target: "esnext",
    },
  },
  compatibilityDate: "2024-12-10",
});
