/**
 * UIRenderer - Single Responsibility: Render UI and handle DOM updates
 * Implements IUIRenderer and ITimerObserver for reactive updates
 */

import type {
  IUIRenderer,
  ITimerObserver,
  IDashboard,
  TimerState,
  ICountdownTimerState,
} from "../types/index"
import { ITimerService } from "../types/index"
import { HtmlSanitizer } from "../utils/HtmlSanitizer"
import { TimeFormatter } from "../utils/TimeFormatter"

export class UIRenderer implements IUIRenderer, ITimerObserver {
  private timerService: ITimerService

  constructor(timerService: ITimerService) {
    this.timerService = timerService
  }

  render(
    dashboards: IDashboard[],
    currentDashboard: IDashboard | null,
    allTimers: TimerState[],
  ): void {
    this.renderDashboards(dashboards, currentDashboard)
    this.renderTimers(allTimers, currentDashboard)
  }

  private renderDashboards(dashboards: IDashboard[], currentDashboard: IDashboard | null): void {
    const container = document.getElementById("dashboardsContainer")
    if (!container) return

    if (dashboards.length === 0) {
      container.innerHTML = ""
      return
    }

    const dashboardsHtml = dashboards
      .map((dashboard) => {
        const isActive = currentDashboard?.id === dashboard.id
        const activeClass = isActive ? "active" : ""

        return `
          <div class="dashboards-buttons">
            <button class="dashboard-btn ${activeClass}" onclick="window.app.selectDashboard('${dashboard.id}')">
              ${HtmlSanitizer.escape(dashboard.name)} (${dashboard.timerIds.length})
            </button>
            <button class="dashboard-delete-btn" onclick="window.app.deleteDashboard('${dashboard.id}')">×</button>
          </div>
        `
      })
      .join("")

    container.innerHTML = `<div class="dashboards-list">${dashboardsHtml}</div>`
  }

  private renderTimers(allTimers: TimerState[], currentDashboard: IDashboard | null): void {
    const container = document.getElementById("timersContainer")
    if (!container) return

    if (!currentDashboard) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No dashboard selected. Create one to get started!</p>
        </div>
      `
      return
    }

    if (currentDashboard.timerIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No timers in "${HtmlSanitizer.escape(currentDashboard.name)}". Create one to get started!</p>
        </div>
      `
      return
    }

    const timerMap = new Map(allTimers.map((t) => [t.id, t]))
    const timersToRender = currentDashboard.timerIds
      .map((id: number) => timerMap.get(id))
      .filter((t: TimerState | undefined): t is TimerState => t !== undefined)

    container.innerHTML = `
      <div class="timers-grid">
        ${timersToRender.map((timer: TimerState) => this.renderTimerCard(timer)).join("")}
      </div>
    `
  }

  private renderTimerCard(timer: TimerState): string {
    const displayTime = this.getDisplayTime(timer)
    const isRunning = timer.isRunning
    const isFinished = timer.isFinished

    const cardClasses = [
      "timer-card",
      isRunning && "active",
      isFinished && "finished",
      isFinished &&
        timer.type === "countdown" &&
        !(timer as ICountdownTimerState).isAcknowledged &&
        "flashing",
    ]
      .filter(Boolean)
      .join(" ")

    const controlsHtml =
      timer.type === "countup"
        ? this.renderCountupControls(timer.id)
        : this.renderCountdownControls(timer.id)

    const configHtml =
      timer.type === "countdown" ? this.renderAlertConfig(timer as ICountdownTimerState) : ""

    return `
      <div class="${cardClasses}">
        <div class="timer-label">${HtmlSanitizer.escape(timer.label)}</div>
        <div class="timer-display">${displayTime}</div>
        ${configHtml}
        <div class="timer-controls">
          ${controlsHtml}
        </div>
      </div>
    `
  }

  private renderAlertConfig(timer: ICountdownTimerState): string {
    const config = timer.alertConfig

    if (!config.enabled) {
      return '<div class="timer-config"><span class="config-badge">No Alert</span></div>'
    }

    const repeatText =
      config.repeatCount === "infinite"
        ? "∞ repeats"
        : `${config.repeatCount}x repeat${config.repeatCount !== 1 ? "s" : ""}`

    return `
      <div class="timer-config">
        <span class="config-badge">${repeatText}</span>
        <span class="config-badge">${config.waitBetweenRepeat}s wait</span>
      </div>
    `
  }

  private renderCountdownControls(timerId: number): string {
    const timer = this.timerService.getTimer(timerId)
    const isRunning = timer?.isRunning ?? false
    const isFinished = timer?.isFinished ?? false
    const isAcknowledged =
      timer && timer.type === "countdown" ? (timer as ICountdownTimerState).isAcknowledged : false

    // If finished and not acknowledged, show Acknowledge and Stop Alert buttons
    if (isFinished && !isAcknowledged) {
      return `
        <button class="btn btn-acknowledge" onclick="window.app.acknowledgeTimer(${timerId})">Acknowledge</button>
        <button class="btn btn-stop-alert" onclick="window.app.stopAlert(${timerId})">Stop Alert</button>
        <button class="btn btn-delete" onclick="window.app.deleteTimer(${timerId})">Delete</button>
      `
    }
    // If finished and acknowledged, show Start and Reset buttons
    if (isFinished && isAcknowledged) {
      return `
        <button class="btn btn-start" onclick="window.app.startTimer(${timerId})">Start</button>
        <button class="btn btn-pause" onclick="window.app.resetCountdownTimer(${timerId})">Reset</button>
        <button class="btn btn-delete" onclick="window.app.deleteTimer(${timerId})">Delete</button>
      `
    }
    // Timer is running or paused
    return `
      <button class="btn btn-${isRunning ? "pause" : "start"}" onclick="window.app.${isRunning ? "pauseTimer" : "startTimer"}(${timerId})">
        ${isRunning ? "Pause" : "Start"}
      </button>
      <button class="btn btn-pause" onclick="window.app.resetCountdownTimer(${timerId})">Reset</button>
      <button class="btn btn-delete" onclick="window.app.deleteTimer(${timerId})">Delete</button>
    `
  }

  private renderCountupControls(timerId: number): string {
    const timer = this.timerService.getTimer(timerId)
    const isRunning = timer?.isRunning ?? false

    return `
      <button class="btn btn-${isRunning ? "pause" : "start"}" onclick="window.app.${isRunning ? "pauseTimer" : "startTimer"}(${timerId})">
        ${isRunning ? "Pause" : "Start"}
      </button>
      <button class="btn btn-delete" onclick="window.app.resetCountupTimer(${timerId})">Reset</button>
      <button class="btn btn-delete" onclick="window.app.deleteTimer(${timerId})">Delete</button>
    `
  }

  private getDisplayTime(timer: TimerState): string {
    if (timer.type === "countdown") {
      return TimeFormatter.format(timer.remainingSeconds)
    } else {
      return TimeFormatter.format(timer.elapsedSeconds)
    }
  }

  onTimerUpdated(_timer: TimerState): void {
    // No-op - re-render handled by Application
  }

  onTimerCreated(_timer: TimerState): void {
    // No-op - re-render handled by Application
  }

  onTimerDeleted(_id: number): void {
    // No-op - re-render handled by Application
  }

  onDashboardCreated(_dashboard: IDashboard): void {
    // No-op - re-render handled by Application
  }

  onDashboardUpdated(_dashboard: IDashboard): void {
    // No-op - re-render handled by Application
  }

  onDashboardDeleted(_id: string): void {
    // No-op - re-render handled by Application
  }

  onDashboardSelected(_dashboard: IDashboard): void {
    // No-op - re-render handled by Application
  }
}
