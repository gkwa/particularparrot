/**
 * Application - Orchestrator class
 * Implements Dependency Injection and ties all services together
 * Exposes public API for the UI to interact with
 */

import { TimerService } from "./services/TimerService"
import { AudioService } from "./services/AudioService"
import { StorageService } from "./services/StorageService"
import { DashboardService } from "./services/DashboardService"
import { UIRenderer } from "./ui/UIRenderer"
import { FormHandler } from "./ui/FormHandler"
import type {
  ITimerService,
  IDashboardService,
  ITimerObserver,
  IDashboardObserver,
  TimerState,
  IDashboard,
} from "./types/index"

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
    this.formHandler.updateTimerButtonStates()
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
      pauseTimer: (id: number) => {
        this.timerService.pauseTimer(id)
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
      resetCountdownTimer: (id: number) => {
        this.timerService.resetCountdownTimer(id)
        this.renderUI()
      },
      resetCountupTimer: (id: number) => {
        this.timerService.resetCountupTimer(id)
        this.renderUI()
      },
      acknowledgeTimer: (id: number) => {
        this.timerService.acknowledgeTimer(id)
        this.renderUI()
      },
      stopAlert: (id: number) => {
        this.timerService.stopAlert(id)
        this.renderUI()
      },
      setPreset: (minutes: number) => this.formHandler.setPreset(minutes),
      setMode: (mode: "countdown" | "countup") => this.formHandler.setMode(mode),
      selectDashboard: (id: string) => {
        this.formHandler.selectDashboard(id)
        this.renderUI()
        this.formHandler.updateTimerButtonStates()
      },
      deleteDashboard: (id: string) => {
        this.dashboardService.deleteDashboard(id)
        this.renderUI()
        this.formHandler.updateTimerButtonStates()
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
    this.formHandler.updateTimerButtonStates()
  }

  onDashboardUpdated(_dashboard: IDashboard): void {
    this.renderUI()
  }

  onDashboardDeleted(_id: string): void {
    this.renderUI()
    this.formHandler.updateTimerButtonStates()
  }

  onDashboardSelected(_dashboard: IDashboard): void {
    this.renderUI()
    this.formHandler.updateTimerButtonStates()
  }
}
