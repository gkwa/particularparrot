import { defineConfig } from "vite"
import fs from "fs"
import path from "path"

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: false,
  },
  preview: {
    open: "/particularparrot.html",
  },
  plugins: [
    {
      name: "inline-assets",
      apply: "build",
      enforce: "post",
      async writeBundle() {
        const distDir = path.resolve(__dirname, "dist")
        const htmlPath = path.join(distDir, "index.html")
        const assetsDir = path.join(distDir, "assets")

        if (!fs.existsSync(htmlPath)) {
          return
        }

        if (!fs.existsSync(assetsDir)) {
          return
        }

        let html = fs.readFileSync(htmlPath, "utf-8")

        // Inline all CSS files
        const cssFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith(".css"))

        cssFiles.forEach((cssFile) => {
          const cssPath = path.join(assetsDir, cssFile)
          const css = fs.readFileSync(cssPath, "utf-8")
          html = html.replace(
            new RegExp(`<link[^>]*href="[^"]*${cssFile}"[^>]*>`, "g"),
            `<style>${css}</style>`,
          )
          fs.unlinkSync(cssPath)
        })

        // Inline all JS files (but not sourcemap files)
        const jsFiles = fs
          .readdirSync(assetsDir)
          .filter((file) => file.endsWith(".js") && !file.endsWith(".js.map"))

        jsFiles.forEach((jsFile) => {
          const jsPath = path.join(assetsDir, jsFile)
          const js = fs.readFileSync(jsPath, "utf-8")
          html = html.replace(
            new RegExp(`<script[^>]*src="[^"]*${jsFile}"[^>]*></script>`, "g"),
            `<script>${js}</script>`,
          )
          fs.unlinkSync(jsPath)
        })

        // Write updated HTML
        fs.writeFileSync(htmlPath, html)

        // Only remove assets directory if it's completely empty
        const remainingFiles = fs.readdirSync(assetsDir)
        if (remainingFiles.length === 0) {
          fs.rmdirSync(assetsDir)
        }
      },
    },
  ],
})
