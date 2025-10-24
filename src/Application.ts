/**
 * Application - Main orchestrator
 * Follows Dependency Inversion: depends on interfaces, not concrete implementations
 * Manages dependency injection and application lifecycle
 */

import {
  ITimerService,
  IDashboardService,
  IDashboard,
  IDashboardObserver,
  ITimerObserver,
  TimerState,
} from "./types/index"
import { TimerService } from "./services/TimerService"
import { AudioService } from "./services/AudioService"
import { StorageService } from "./services/StorageService"
import { DashboardService } from "./services/DashboardService"
import { UIRenderer } from "./ui/UIRenderer"
import { FormHandler } from "./ui/FormHandler"

export class Application implements IDashboardObserver, ITimerObserver {
  private timerService: ITimerService
  private dashboardService: IDashboardService
  private uiRenderer: UIRenderer
  private formHandler: FormHandler

  constructor() {
    const audioService = new AudioService()
    const storageService = new StorageService()

    this.timerService = new TimerService(audioService, storageService)
    this.dashboardService = new DashboardService(storageService)
    this.uiRenderer = new UIRenderer(this.timerService)
    this.formHandler = new FormHandler(this.timerService, this.dashboardService)

    this.timerService.subscribe(this.uiRenderer)
    this.timerService.subscribe(this)
    this.dashboardService.subscribe(this.uiRenderer)
    this.dashboardService.subscribe(this)
  }

  initialize(): void {
    this.renderUI()
    this.exposePublicAPI()
  }

  private renderUI(): void {
    const dashboards = this.dashboardService.getAllDashboards()
    const currentDashboard = this.dashboardService.getCurrentDashboard()
    const allTimers = this.timerService.getAllTimers()
    this.uiRenderer.render(dashboards, currentDashboard, allTimers)
  }

  private exposePublicAPI(): void {
    ;(window as any).app = {
      startTimer: (id: number) => {
        this.timerService.startTimer(id)
        this.renderUI()
      },
      deleteTimer: (id: number) => {
        this.timerService.deleteTimer(id)
        const currentDashboard = this.dashboardService.getCurrentDashboard()
        if (currentDashboard) {
          this.dashboardService.removeTimerFromDashboard(currentDashboard.id, id)
        }
        this.renderUI()
      },
      resetCountupTimer: (id: number) => {
        this.timerService.resetCountupTimer(id)
        this.renderUI()
      },
      setPreset: (minutes: number) => this.formHandler.setPreset(minutes),
      setMode: (mode: "countdown" | "countup") => this.formHandler.setMode(mode),
      selectDashboard: (id: string) => {
        this.formHandler.selectDashboard(id)
        this.renderUI()
      },
      deleteDashboard: (id: string) => {
        this.dashboardService.deleteDashboard(id)
        this.renderUI()
      },
    }
  }

  onTimerUpdated(_timer: TimerState): void {
    this.renderUI()
  }

  onTimerCreated(_timer: TimerState): void {
    this.renderUI()
  }

  onTimerDeleted(_id: number): void {
    this.renderUI()
  }

  onDashboardCreated(_dashboard: IDashboard): void {
    this.renderUI()
  }

  onDashboardUpdated(_dashboard: IDashboard): void {
    this.renderUI()
  }

  onDashboardDeleted(_id: string): void {
    this.renderUI()
  }

  onDashboardSelected(_dashboard: IDashboard): void {
    this.renderUI()
  }
}
