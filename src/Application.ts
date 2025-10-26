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
  private uiRenderer: UIRenderer
  private formHandler: FormHandler
  private manifestRepository: ManifestRepository
  private syncUIHandler: SyncUIHandler

  constructor() {
    const audioService = new AudioService()
    const storageService = new StorageService()

    this.timerService = new TimerService(audioService, storageService)
    this.dashboardService = new DashboardService(storageService)
    this.uiRenderer = new UIRenderer(this.timerService)
    this.formHandler = new FormHandler(this.timerService, this.dashboardService)
    this.manifestRepository = new ManifestRepository()
    this.syncUIHandler = new SyncUIHandler(this.manifestRepository)

    this.timerService.subscribe(this.uiRenderer)
    this.timerService.subscribe(this)
    this.dashboardService.subscribe(this.uiRenderer)
    this.dashboardService.subscribe(this)
  }

  initialize(): void {
    this.setupSyncUI()
    this.renderUI()
    this.formHandler.updateTimerButtonStates()
    this.exposePublicAPI()
  }

  private setupSyncUI(): void {
    // Render sync configuration section
    const configHtml = this.syncUIHandler.renderConfigSection()
    const container = document.getElementById("githubConfigContainer")
    if (container) {
      container.innerHTML = configHtml
    }

    // Attach event listeners after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.syncUIHandler.attachEventListeners(
        async (url: string) => {
          console.log("Manifest URL saved:", url)
          // Try to auto-fetch after saving
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
    // Clear existing dashboards
    this.dashboardService.getAllDashboards().forEach((dashboard) => {
      this.dashboardService.deleteDashboard(dashboard.id)
    })

    // Create dashboards from manifest
    for (const dashboardData of manifest.dashboards) {
      const dashboard = this.dashboardService.createDashboard(dashboardData.name)

      // Create timers from manifest
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
        .filter(Boolean),
    }))

    const json = this.manifestRepository.exportAsJson(dashboardsArray)
    const timestamp = new Date().toISOString().split("T")[0]
    this.manifestRepository.downloadManifest(json, `dashboards-${timestamp}.json`)
  }

  private async importDashboards(file: File): Promise<void> {
    const manifest = await this.manifestRepository.importFromFile(file)
    this.loadDashboardsFromManifest(manifest)
    this.renderUI()
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
