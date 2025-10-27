/**
 * main.ts - Application entry point
 * Initializes and starts the application
 */

import "./styles/main.css"
import { Application } from "./Application"

async function main() {
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", async () => {
        const app = new Application()
        await app.initialize()
      })
    } else {
      const app = new Application()
      await app.initialize()
    }
  } catch (err) {
    console.error("Failed to initialize application:", err)
  }
}

main()
