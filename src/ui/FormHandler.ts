/**
 * FormHandler - Single Responsibility: Handle form inputs and validation
 */

import { ITimerService, IDashboardService } from "../types/index"

export class FormHandler {
  private timerService: ITimerService
  private dashboardService: IDashboardService
  private currentMode: "countdown" | "countup" = "countdown"

  constructor(timerService: ITimerService, dashboardService: IDashboardService) {
    this.timerService = timerService
    this.dashboardService = dashboardService
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    const modeCountdownBtn = document.getElementById("modeCountdown")
    const modeCountupBtn = document.getElementById("modeCountup")
    const createTimerBtn = document.getElementById("createTimerBtn")
    const createCountupBtn = document.getElementById("createCountupBtn")
    const createDashboardBtn = document.getElementById("createDashboardBtn")

    modeCountdownBtn?.addEventListener("click", () => this.setMode("countdown"))
    modeCountupBtn?.addEventListener("click", () => this.setMode("countup"))
    createTimerBtn?.addEventListener("click", () => this.createCountdownTimer())
    createCountupBtn?.addEventListener("click", () => this.createCountupTimer())
    createDashboardBtn?.addEventListener("click", () => this.createDashboard())

    const labelInput = document.getElementById("label") as HTMLInputElement
    labelInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.currentMode === "countdown") {
        this.createCountdownTimer()
      }
    })

    const labelCountupInput = document.getElementById("labelCountup") as HTMLInputElement
    labelCountupInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.currentMode === "countup") {
        this.createCountupTimer()
      }
    })
  }

  setMode(mode: "countdown" | "countup"): void {
    this.currentMode = mode

    const modeCountdown = document.getElementById("modeCountdown")
    const modeCountup = document.getElementById("modeCountup")
    const countdownInputs = document.getElementById("countdownInputs")
    const countupInputs = document.getElementById("countupInputs")

    if (mode === "countdown") {
      modeCountdown?.classList.add("active")
      modeCountup?.classList.remove("active")
      if (countdownInputs) {
        countdownInputs.style.display = "grid"
      }
      if (countupInputs) {
        countupInputs.style.display = "none"
      }
    } else {
      modeCountdown?.classList.remove("active")
      modeCountup?.classList.add("active")
      if (countdownInputs) {
        countdownInputs.style.display = "none"
      }
      if (countupInputs) {
        countupInputs.style.display = "grid"
      }
    }
  }

  setPreset(minutes: number): void {
    const hoursInput = document.getElementById("hours") as HTMLInputElement
    const minutesInput = document.getElementById("minutes") as HTMLInputElement
    const secondsInput = document.getElementById("seconds") as HTMLInputElement

    if (hoursInput) hoursInput.value = "0"
    if (minutesInput) minutesInput.value = String(minutes)
    if (secondsInput) secondsInput.value = "0"
  }

  selectDashboard(dashboardId: string): void {
    this.dashboardService.selectDashboard(dashboardId)
  }

  private createCountdownTimer(): void {
    const labelInput = document.getElementById("label") as HTMLInputElement
    const hoursInput = document.getElementById("hours") as HTMLInputElement
    const minutesInput = document.getElementById("minutes") as HTMLInputElement
    const secondsInput = document.getElementById("seconds") as HTMLInputElement

    const label = labelInput?.value || "Timer"
    const hours = parseInt(hoursInput?.value || "0", 10) || 0
    const minutes = parseInt(minutesInput?.value || "0", 10) || 0
    const seconds = parseInt(secondsInput?.value || "0", 10) || 0

    try {
      const timer = this.timerService.createCountdownTimer(label, hours, minutes, seconds)

      const currentDashboard = this.dashboardService.getCurrentDashboard()
      if (currentDashboard) {
        this.dashboardService.addTimerToDashboard(currentDashboard.id, timer.id)
      }

      if (labelInput) labelInput.value = ""
      if (hoursInput) hoursInput.value = "0"
      if (minutesInput) minutesInput.value = "5"
      if (secondsInput) secondsInput.value = "0"
    } catch (error) {
      alert(`Error creating timer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private createCountupTimer(): void {
    const labelInput = document.getElementById("labelCountup") as HTMLInputElement
    const label = labelInput?.value || "Counter"

    try {
      const timer = this.timerService.createCountupTimer(label)

      const currentDashboard = this.dashboardService.getCurrentDashboard()
      if (currentDashboard) {
        this.dashboardService.addTimerToDashboard(currentDashboard.id, timer.id)
      }

      if (labelInput) labelInput.value = ""
    } catch (error) {
      alert(`Error creating counter: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private createDashboard(): void {
    const dashboardNameInput = document.getElementById("dashboardName") as HTMLInputElement
    const name = dashboardNameInput?.value?.trim()

    if (!name) {
      alert("Please enter a dashboard name")
      return
    }

    try {
      this.dashboardService.createDashboard(name)
      if (dashboardNameInput) dashboardNameInput.value = ""
    } catch (error) {
      alert(`Error creating dashboard: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}
