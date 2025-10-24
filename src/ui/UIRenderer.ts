/**
 * UIRenderer - Single Responsibility: Render UI components
 * Implements IUIRenderer, ITimerObserver, and IDashboardObserver
 */

import {
  IUIRenderer,
  ITimerObserver,
  IDashboardObserver,
  TimerState,
  ITimerService,
  IDashboard,
} from "../types/index"
import { TimeFormatter } from "../utils/TimeFormatter"
import { HtmlSanitizer } from "../utils/HtmlSanitizer"

export class UIRenderer implements IUIRenderer, ITimerObserver, IDashboardObserver {
  private timerService: ITimerService

  constructor(timerService: ITimerService) {
    this.timerService = timerService
  }

  render(
    dashboards: IDashboard[],
    currentDashboard: IDashboard | null,
    allTimers: TimerState[],
  ): void {
    this.renderDashboards(dashboards, currentDashboard?.id || "")
    this.renderTimers(currentDashboard, allTimers)
  }

  private renderDashboards(dashboards: IDashboard[], currentId: string): void {
    const container = document.getElementById("dashboardsContainer")
    if (!container) return

    container.innerHTML = `
      <div class="dashboards-list">
        <h3>Dashboards</h3>
        <div class="dashboards-buttons">
          ${dashboards
            .map(
              (dashboard) => `
            <button class="dashboard-btn ${dashboard.id === currentId ? "active" : ""}"
                    onclick="window.app.selectDashboard('${dashboard.id}')">
              ${HtmlSanitizer.escape(dashboard.name)}
              <span class="timer-count">(${dashboard.timerIds.length})</span>
            </button>
            <button class="dashboard-delete-btn" onclick="window.app.deleteDashboard('${dashboard.id}')">×</button>
          `,
            )
            .join("")}
        </div>
      </div>
    `
  }

  private renderTimers(dashboard: IDashboard | null, allTimers: TimerState[]): void {
    const container = document.getElementById("timersContainer")
    if (!container) return

    if (!dashboard) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No dashboard selected. Create one to get started!</p>
        </div>
      `
      return
    }

    if (dashboard.timerIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No timers in "${HtmlSanitizer.escape(dashboard.name)}". Create one to get started!</p>
        </div>
      `
      return
    }

    const timerMap = new Map(allTimers.map((t) => [t.id, t]))
    const timersToRender = dashboard.timerIds
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

    const cardClasses = ["timer-card", isRunning && "active", isFinished && "finished"]
      .filter(Boolean)
      .join(" ")

    const controlsHtml =
      timer.type === "countup"
        ? this.renderCountupControls(timer.id)
        : this.renderCountdownControls(timer.id)

    const typeIndicator =
      timer.type === "countup"
        ? '<div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">⏲️ Counting up</div>'
        : ""

    return `
      <div class="${cardClasses}">
        <div class="timer-label">${HtmlSanitizer.escape(timer.label)}</div>
        ${typeIndicator}
        <div class="timer-display">${displayTime}</div>
        <div class="timer-controls">
          ${controlsHtml}
        </div>
      </div>
    `
  }

  private renderCountdownControls(timerId: number): string {
    const timer = this.timerService.getTimer(timerId)
    const isRunning = timer?.isRunning ?? false

    return `
      <button class="btn btn-${isRunning ? "pause" : "start"}" onclick="window.app.startTimer(${timerId})">
        ${isRunning ? "Pause" : "Start"}
      </button>
      <button class="btn btn-delete" onclick="window.app.deleteTimer(${timerId})">Delete</button>
    `
  }

  private renderCountupControls(timerId: number): string {
    const timer = this.timerService.getTimer(timerId)
    const isRunning = timer?.isRunning ?? false

    return `
      <button class="btn btn-${isRunning ? "pause" : "start"}" onclick="window.app.startTimer(${timerId})">
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
