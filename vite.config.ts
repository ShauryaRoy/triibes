import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cartographerPlugin =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [require("@replit/vite-plugin-cartographer").cartographer()]
    : [];

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...cartographerPlugin,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
    ],
    exclude: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild', // ✅ esbuild is faster than terser
    cssMinify: 'esbuild', // ✅ Use esbuild for CSS minification (better compatibility)
    cssCodeSplit: true, // Split CSS for better caching
    // Code splitting for better caching and loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['wouter'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    // ✅ Enable compression analysis
    reportCompressedSize: true,
  },
  server: {
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
