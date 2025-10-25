/**
 * FormHandler - Single Responsibility: Handle form inputs and user interactions
 */

import { ITimerService, IDashboardService, IAlertConfig } from "../types/index"

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
    // Mode switching
    const modeCountdownBtn = document.getElementById("modeCountdown")
    const modeCountupBtn = document.getElementById("modeCountup")

    modeCountdownBtn?.addEventListener("click", () => this.setMode("countdown"))
    modeCountupBtn?.addEventListener("click", () => this.setMode("countup"))

    // Dashboard creation
    const createDashboardBtn = document.getElementById("createDashboardBtn")
    createDashboardBtn?.addEventListener("click", () => this.createDashboard())

    const dashboardNameInput = document.getElementById("dashboardName") as HTMLInputElement
    dashboardNameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.createDashboard()
      }
    })
    dashboardNameInput?.addEventListener("input", () => this.updateDashboardButtonState())

    // Alert config listeners
    const repeatModeSelect = document.getElementById("repeatMode") as HTMLSelectElement
    repeatModeSelect?.addEventListener("change", () => this.updateRepeatConfigVisibility())

    // Timer creation
    const createTimerBtn = document.getElementById("createTimerBtn")
    createTimerBtn?.addEventListener("click", () => this.createCountdownTimer())

    const labelInput = document.getElementById("label") as HTMLInputElement
    labelInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.currentMode === "countdown") {
        this.createCountdownTimer()
      }
    })

    const timeFormatInput = document.getElementById("timeFormat") as HTMLInputElement
    timeFormatInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.currentMode === "countdown") {
        this.createCountdownTimer()
      }
    })

    // Countup creation
    const createCountupBtn = document.getElementById("createCountupBtn")
    createCountupBtn?.addEventListener("click", () => this.createCountupTimer())

    const labelCountupInput = document.getElementById("labelCountup") as HTMLInputElement
    labelCountupInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.currentMode === "countup") {
        this.createCountupTimer()
      }
    })

    this.updateDashboardButtonState()
  }

  private updateRepeatConfigVisibility(): void {
    const repeatMode = (document.getElementById("repeatMode") as HTMLSelectElement).value
    const repeatCountGroup = document.getElementById("repeatCountGroup")

    if (repeatCountGroup) {
      repeatCountGroup.style.display = repeatMode === "finite" ? "grid" : "none"
    }
  }

  private getAlertConfig(): IAlertConfig {
    const alertEnabled = (document.getElementById("alertEnabled") as HTMLInputElement).checked
    const repeatMode = (document.getElementById("repeatMode") as HTMLSelectElement).value
    const repeatCount = parseInt(
      (document.getElementById("repeatCount") as HTMLInputElement).value,
      10,
    )
    const waitBetweenRepeat = parseInt(
      (document.getElementById("waitBetweenRepeat") as HTMLInputElement).value,
      10,
    )
    const utteranceTemplate = (
      document.getElementById("utteranceTemplate") as HTMLInputElement
    ).value.trim()

    let config: IAlertConfig

    if (repeatMode === "once") {
      config = {
        enabled: alertEnabled,
        repeatCount: 1,
        waitBetweenRepeat: 0,
        utteranceTemplate: utteranceTemplate || "timer {timer name} has completed",
      }
    } else if (repeatMode === "finite") {
      config = {
        enabled: alertEnabled,
        repeatCount: Math.max(1, repeatCount),
        waitBetweenRepeat,
        utteranceTemplate: utteranceTemplate || "timer {timer name} has completed",
      }
    } else {
      // infinite
      config = {
        enabled: alertEnabled,
        repeatCount: "infinite",
        waitBetweenRepeat,
        utteranceTemplate: utteranceTemplate || "timer {timer name} has completed",
      }
    }

    return config
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
    const timeInput = document.getElementById("timeFormat") as HTMLInputElement
    if (timeInput) {
      timeInput.value = `${minutes}m`
    }
  }

  selectDashboard(dashboardId: string): void {
    this.dashboardService.selectDashboard(dashboardId)
  }

  private updateDashboardButtonState(): void {
    const dashboardNameInput = document.getElementById("dashboardName") as HTMLInputElement
    const createDashboardBtn = document.getElementById("createDashboardBtn") as HTMLButtonElement

    const hasText = dashboardNameInput?.value?.trim().length ?? 0 > 0

    if (createDashboardBtn) {
      createDashboardBtn.disabled = !hasText
    }
  }

  updateTimerButtonStates(): void {
    const createTimerBtn = document.getElementById("createTimerBtn") as HTMLButtonElement
    const createCountupBtn = document.getElementById("createCountupBtn") as HTMLButtonElement
    const modeSelector = document.querySelector(".mode-selector") as HTMLElement
    const countdownInputs = document.getElementById("countdownInputs") as HTMLElement
    const countupInputs = document.getElementById("countupInputs") as HTMLElement

    const hasDashboard = this.dashboardService.getCurrentDashboard() !== null

    if (createTimerBtn) {
      createTimerBtn.disabled = !hasDashboard
    }
    if (createCountupBtn) {
      createCountupBtn.disabled = !hasDashboard
    }
    if (modeSelector) {
      modeSelector.style.opacity = hasDashboard ? "1" : "0.5"
      modeSelector.style.pointerEvents = hasDashboard ? "auto" : "none"
    }
    if (countdownInputs) {
      countdownInputs.style.opacity = hasDashboard ? "1" : "0.5"
      countdownInputs.style.pointerEvents = hasDashboard ? "auto" : "none"
    }
    if (countupInputs) {
      countupInputs.style.opacity = hasDashboard ? "1" : "0.5"
      countupInputs.style.pointerEvents = hasDashboard ? "auto" : "none"
    }
  }

  private parseTimeFormat(format: string): number | null {
    const format_lower = format.toLowerCase().trim()

    if (!format_lower) return null

    let totalSeconds = 0
    const dayMatch = format_lower.match(/(\d+)\s*d/)
    const hourMatch = format_lower.match(/(\d+)\s*h/)
    const minMatch = format_lower.match(/(\d+)\s*m/)
    const secMatch = format_lower.match(/(\d+)\s*s/)

    if (!dayMatch && !hourMatch && !minMatch && !secMatch) {
      return null
    }

    if (dayMatch) {
      totalSeconds += parseInt(dayMatch[1]) * 86400
    }
    if (hourMatch) {
      totalSeconds += parseInt(hourMatch[1]) * 3600
    }
    if (minMatch) {
      totalSeconds += parseInt(minMatch[1]) * 60
    }
    if (secMatch) {
      totalSeconds += parseInt(secMatch[1])
    }

    return totalSeconds
  }

  private createCountdownTimer(): void {
    const currentDashboard = this.dashboardService.getCurrentDashboard()
    if (!currentDashboard) {
      alert("Please create or select a dashboard first")
      return
    }

    const labelInput = document.getElementById("label") as HTMLInputElement
    const timeInput = document.getElementById("timeFormat") as HTMLInputElement

    const label = labelInput?.value?.trim() || ""
    const timeFormat = timeInput?.value?.trim() || ""

    if (!label) {
      alert("Please enter a timer label")
      return
    }

    if (!timeFormat) {
      alert("Please enter a time format (e.g., 2h3m4s)")
      return
    }

    // Check for duplicate label in current dashboard
    if (!this.isLabelUnique(label, "countdown")) {
      alert("A timer with this label already exists in the current dashboard")
      return
    }

    const totalSeconds = this.parseTimeFormat(timeFormat)
    if (totalSeconds === null || totalSeconds <= 0) {
      alert("Invalid time format. Use formats like: 2h3m4s, 5m, 30s")
      return
    }

    // Get alert configuration from form
    const alertConfig = this.getAlertConfig()

    // Create timer with alert config
    const timer = this.timerService.createCountdownTimer(label, totalSeconds, alertConfig)

    this.dashboardService.addTimerToDashboard(currentDashboard.id, timer.id)

    labelInput.value = ""
    timeInput.value = ""
  }

  private createCountupTimer(): void {
    const currentDashboard = this.dashboardService.getCurrentDashboard()
    if (!currentDashboard) {
      alert("Please create or select a dashboard first")
      return
    }

    const labelCountupInput = document.getElementById("labelCountup") as HTMLInputElement
    const label = labelCountupInput?.value?.trim() || ""

    if (!label) {
      alert("Please enter a timer label")
      return
    }

    // Check for duplicate label in current dashboard
    if (!this.isLabelUnique(label, "countup")) {
      alert("A timer with this label already exists in the current dashboard")
      return
    }

    const timer = this.timerService.createCountupTimer(label)
    this.dashboardService.addTimerToDashboard(currentDashboard.id, timer.id)

    labelCountupInput.value = ""
  }

  private createDashboard(): void {
    const dashboardNameInput = document.getElementById("dashboardName") as HTMLInputElement
    const name = dashboardNameInput?.value?.trim() || ""

    if (!name) {
      alert("Please enter a dashboard name")
      return
    }

    this.dashboardService.createDashboard(name)
    dashboardNameInput.value = ""
    this.updateDashboardButtonState()
  }

  private isLabelUnique(label: string, type: "countdown" | "countup"): boolean {
    const currentDashboard = this.dashboardService.getCurrentDashboard()
    if (!currentDashboard) {
      return true
    }

    const allTimers = this.timerService.getAllTimers()
    return !allTimers.some(
      (timer) =>
        timer.label === label &&
        timer.type === type &&
        currentDashboard.timerIds.includes(timer.id),
    )
  }
}
