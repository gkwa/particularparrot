/**
 * ScreenWakeLockUIController - Single Responsibility: Manage Screen Wake Lock UI
 * Handles UI updates and user interactions for the screen wake lock feature
 */

import type { IScreenWakeLockService, IScreenWakeLockUIController } from "../types"

export class ScreenWakeLockUIController implements IScreenWakeLockUIController {
  private toggle: HTMLInputElement
  private statusElement: HTMLElement
  private screenWakeLockService: IScreenWakeLockService
  private onWakeLockDesiredChange: (desired: boolean) => void

  constructor(
    screenWakeLockService: IScreenWakeLockService,
    onWakeLockDesiredChange: (desired: boolean) => void,
    onWakeLockReleased: () => void,
  ) {
    const toggle = document.getElementById("screenWakeToggle") as HTMLInputElement | null
    const status = document.getElementById("wakeLockStatus") as HTMLElement | null

    if (!toggle || !status) {
      throw new Error("Required screen wake lock DOM elements not found")
    }

    this.toggle = toggle
    this.statusElement = status
    this.screenWakeLockService = screenWakeLockService
    this.onWakeLockDesiredChange = onWakeLockDesiredChange
    this.screenWakeLockService.setOnReleaseCallback(onWakeLockReleased)
  }

  initialize(): void {
    if (!this.screenWakeLockService.isSupported()) {
      this.toggle.disabled = true
      this.showStatus("Wake Lock API not supported on this browser", "error")
      return
    }

    this.showStatus("Wake Lock API supported", "success")
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.toggle.addEventListener("change", async (e: Event) => {
      const target = e.target as HTMLInputElement
      await this.handleToggle(target.checked)
    })
  }

  private async handleToggle(shouldEnable: boolean): Promise<void> {
    this.onWakeLockDesiredChange(shouldEnable)

    try {
      if (shouldEnable) {
        await this.screenWakeLockService.acquire()
        this.updateStatus(true)
        this.showStatus("✓ Wake lock active - screen will stay on", "success")
      } else {
        await this.screenWakeLockService.release()
        this.updateStatus(false)
        this.showStatus("Wake lock released", "")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      this.showStatus("✗ Failed: " + message, "error")
      this.toggle.checked = false
      this.onWakeLockDesiredChange(false)
    }
  }

  updateStatus(isActive: boolean): void {
    this.toggle.checked = isActive
  }

  private showStatus(message: string, type: "success" | "error" | ""): void {
    this.statusElement.textContent = message
    this.statusElement.className = "wake-lock-status"
    if (type) {
      this.statusElement.classList.add(type)
    }
  }
}
