import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  // Change this to your repository name if deploying to https://username.github.io/repo-name/
  // Leave as '/' if deploying to a custom domain or https://username.github.io/
  base: '/ITAIKO-Web/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
