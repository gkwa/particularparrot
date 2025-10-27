/**
 * Main entry point for the Multi-Timer application
 */

import { Application } from "./Application"
import "./styles/main.css"

// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new Application()
  app.initialize()
})
