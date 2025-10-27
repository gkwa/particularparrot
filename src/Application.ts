/**
 * Application - Orchestrator class
 * Implements Dependency Injection and ties all services together
 * Exposes public API for the UI to interact with
 */

import { TimerService } from "./services/TimerService"
import { AudioService } from "./services/AudioService"
import { StorageService } from "./services/StorageService"
import { DashboardService } from "./services/DashboardService"
import { ScreenWakeLockService } from "./services/ScreenWakeLockService"
import { UIRenderer } from "./ui/UIRenderer"
import { FormHandler } from "./ui/FormHandler"
import { ScreenWakeLockUIController } from "./ui/ScreenWakeLockUIController"
import { ManifestRepository } from "./services/ManifestRepository"
import { SyncUIHandler } from "./ui/SyncUIHandler"
import type {
  ITimerService,
  IDashboardService,
  ITimerObserver,
  IDashboardObserver,
  TimerState,
  IDashboard,
  ICountdownTimerState,
} from "./types/index"

export class Application implements IDashboardObserver, ITimerObserver {
  private timerService: ITimerService
  private dashboardService: IDashboardService
  private screenWakeLockService: ScreenWakeLockService
  private uiRenderer: UIRenderer
  private formHandler: FormHandler
  private screenWakeLockUIController: ScreenWakeLockUIController | null = null
  private manifestRepository: ManifestRepository
  private syncUIHandler: SyncUIHandler
  private wakeLockDesired: boolean = false

  constructor() {
    const audioService = new AudioService()
    const storageService = new StorageService()

    this.timerService = new TimerService(audioService, storageService)
    this.dashboardService = new DashboardService(storageService)
    this.screenWakeLockService = new ScreenWakeLockService()
    this.uiRenderer = new UIRenderer(this.timerService)
    this.formHandler = new FormHandler(this.timerService, this.dashboardService)
    this.manifestRepository = new ManifestRepository()
    this.syncUIHandler = new SyncUIHandler(this.manifestRepository)

    this.timerService.subscribe(this.uiRenderer)
    this.timerService.subscribe(this)
    this.dashboardService.subscribe(this.uiRenderer)
    this.dashboardService.subscribe(this)
  }

  async initialize(): Promise<void> {
    this.initializeScreenWakeLock()
    this.setupSyncUI()
    this.renderUI()
    this.formHandler.updateTimerButtonStates()
    this.exposePublicAPI()
    this.setupVisibilityChangeHandler()
  }

  private initializeScreenWakeLock(): void {
    try {
      this.screenWakeLockUIController = new ScreenWakeLockUIController(
        this.screenWakeLockService,
        (desired: boolean) => {
          this.wakeLockDesired = desired
        },
        () => this.handleWakeLockReleased(),
      )
      this.screenWakeLockUIController.initialize()
    } catch (err) {
      console.log("Screen wake lock UI not available:", err)
    }
  }

  private async handleWakeLockReleased(): Promise<void> {
    alert("handleWakeLockReleased called. wakeLockDesired=" + this.wakeLockDesired + ", hidden=" + document.hidden)
    if (this.wakeLockDesired && !document.hidden) {
      try {
        alert("Trying to re-acquire...")
        await this.screenWakeLockService.acquire()
        alert("Re-acquire succeeded!")
        if (this.screenWakeLockUIController) {
          this.screenWakeLockUIController.updateStatus(true)
        }
      } catch (err) {
        alert("Re-acquire FAILED: " + (err instanceof Error ? err.message : String(err)))
        console.error("Failed to re-acquire wake lock:", err)
      }
    } else {
      alert("Not re-acquiring because wakeLockDesired=" + this.wakeLockDesired + " or document.hidden=" + document.hidden)
    }
  }

  private setupVisibilityChangeHandler(): void {
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && this.wakeLockDesired && !this.screenWakeLockService.isActive()) {
        try {
          await this.screenWakeLockService.acquire()
          if (this.screenWakeLockUIController) {
            this.screenWakeLockUIController.updateStatus(true)
          }
        } catch (err) {
          console.error("Failed to re-acquire wake lock:", err)
        }
      }
    })
  }

  private setupSyncUI(): void {
    const configHtml = this.syncUIHandler.renderConfigSection()
    const container = document.getElementById("githubConfigContainer")
    if (container) {
      container.innerHTML = configHtml
    }

    setTimeout(() => {
      this.syncUIHandler.attachEventListeners(
        async (url: string) => {
          console.log("Manifest URL saved:", url)
          try {
            await this.loadFromRemote()
          } catch (e) {
            console.log("Auto-fetch skipped (may not have dashboards yet)")
          }
        },
        () => this.loadFromRemote(),
        () => {
          this.dashboardService.getAllDashboards().forEach((dashboard) => {
            this.dashboardService.deleteDashboard(dashboard.id)
          })
          this.renderUI()
        },
        () => this.exportDashboards(),
        (file: File) => this.importDashboards(file),
      )
    }, 100)
  }

  private async loadFromRemote(): Promise<void> {
    try {
      const manifest = await this.manifestRepository.fetchFromRemote()
      this.loadDashboardsFromManifest(manifest)
      this.renderUI()
    } catch (error) {
      console.error("Failed to load dashboards from remote:", error)
      throw error
    }
  }

  private loadDashboardsFromManifest(manifest: any): void {
    this.dashboardService.getAllDashboards().forEach((dashboard) => {
      this.dashboardService.deleteDashboard(dashboard.id)
    })

    for (const dashboardData of manifest.dashboards) {
      const dashboard = this.dashboardService.createDashboard(dashboardData.name)

      for (const timerData of dashboardData.timers) {
        if (timerData.type === "countdown") {
          const timer = this.timerService.createCountdownTimer(
            timerData.label,
            timerData.totalSeconds || 0,
            timerData.alertConfig || {
              enabled: true,
              utteranceTemplate: "timer {timer name} has completed",
              repeatCount: "infinite",
              waitBetweenRepeat: 10,
            },
          )
          this.dashboardService.addTimerToDashboard(dashboard.id, timer.id)
        } else if (timerData.type === "countup") {
          const timer = this.timerService.createCountupTimer(timerData.label)
          this.dashboardService.addTimerToDashboard(dashboard.id, timer.id)
        }
      }
    }
  }

  private exportDashboards(): void {
    const dashboardsArray = this.dashboardService.getAllDashboards().map((dashboard) => ({
      id: dashboard.id,
      name: dashboard.name,
      timers: dashboard.timerIds
        .map((timerId) => {
          const timerState = this.timerService.getTimer(timerId)
          if (!timerState) return null

          const timerObj: any = {
            id: timerId,
            label: timerState.label,
            type: timerState.type,
          }

          if (timerState.type === "countdown") {
            const countdownTimer = timerState as ICountdownTimerState
            timerObj.totalSeconds = countdownTimer.totalSeconds
            timerObj.alertConfig = countdownTimer.alertConfig
          }

          return timerObj
        })
        .filter((timer) => timer !== null),
    }))

    const manifest = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      dashboards: dashboardsArray,
    }

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `particularparrot-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  private async importDashboards(file: File): Promise<void> {
    try {
      const text = await file.text()
      const manifest = JSON.parse(text)
      this.loadDashboardsFromManifest(manifest)
      this.renderUI()
    } catch (error) {
      console.error("Failed to import dashboards:", error)
      throw error
    }
  }

  private renderUI(): void {
    const dashboards = this.dashboardService.getAllDashboards()
    const currentDashboard = this.dashboardService.getCurrentDashboard()
    const timers = this.timerService.getAllTimers()
    this.uiRenderer.render(dashboards, currentDashboard, timers)
  }

  private exposePublicAPI(): void {
    ;(window as any).app = this
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

  startTimer(id: number): void {
    this.timerService.startTimer(id)
  }

  pauseTimer(id: number): void {
    this.timerService.pauseTimer(id)
  }

  deleteTimer(id: number): void {
    this.timerService.deleteTimer(id)
  }

  resetCountdownTimer(id: number): void {
    this.timerService.resetCountdownTimer(id)
  }

  resetCountupTimer(id: number): void {
    this.timerService.resetCountupTimer(id)
  }

  acknowledgeTimer(id: number): void {
    this.timerService.acknowledgeTimer(id)
  }

  stopAlert(id: number): void {
    this.timerService.stopAlert(id)
  }

  selectDashboard(dashboardId: string): void {
    this.dashboardService.selectDashboard(dashboardId)
  }

  deleteDashboard(dashboardId: string): void {
    this.dashboardService.deleteDashboard(dashboardId)
  }
}
