/**
 * DashboardService - Single Responsibility: Manage dashboards and their state
 * Implements IDashboardService with Observer pattern
 */

import { IDashboardService, IDashboard, IDashboardObserver, IStorageService } from "../types/index"

export class DashboardService implements IDashboardService {
  private dashboards: Map<string, IDashboard> = new Map()
  private currentDashboard: IDashboard | null = null
  private observers: Set<IDashboardObserver> = new Set()
  private storageService: IStorageService

  constructor(storageService: IStorageService) {
    this.storageService = storageService
    this.loadDashboards()
  }

  private loadDashboards(): void {
    const all = this.storageService.getAllDashboards()
    all.forEach((dashboard: any) => {
      // Migrate old format (timers array) to new format (timerIds array)
      const migratedDashboard: IDashboard = {
        id: dashboard.id,
        name: dashboard.name,
        timerIds:
          dashboard.timerIds ||
          (Array.isArray(dashboard.timers) ? dashboard.timers.map((t: any) => t.id) : []),
        createdAt: dashboard.createdAt,
      }
      this.dashboards.set(dashboard.id, migratedDashboard)
    })

    // Save migrated dashboards back to storage
    if (all.length > 0) {
      this.dashboards.forEach((dashboard) => {
        this.storageService.saveDashboard(dashboard)
      })
    }

    const currentId = this.storageService.getCurrentDashboard()
    if (currentId && this.dashboards.has(currentId)) {
      this.currentDashboard = this.dashboards.get(currentId) || null
    } else if (this.dashboards.size > 0) {
      this.currentDashboard = Array.from(this.dashboards.values())[0]
    }
  }

  createDashboard(name: string): IDashboard {
    const id = `dashboard-${Date.now()}`
    const dashboard: IDashboard = {
      id,
      name,
      timerIds: [],
      createdAt: Date.now(),
    }

    this.dashboards.set(id, dashboard)
    this.storageService.saveDashboard(dashboard)

    if (!this.currentDashboard) {
      this.currentDashboard = dashboard
      this.storageService.saveCurrentDashboard(id)
    }

    this.notifyObservers("onDashboardCreated", dashboard)
    return dashboard
  }

  deleteDashboard(id: string): void {
    this.dashboards.delete(id)
    this.storageService.deleteDashboard(id)

    if (this.currentDashboard?.id === id) {
      this.currentDashboard = Array.from(this.dashboards.values())[0] || null
      if (this.currentDashboard) {
        this.storageService.saveCurrentDashboard(this.currentDashboard.id)
      }
    }

    this.notifyObservers("onDashboardDeleted", id)
  }

  selectDashboard(id: string): void {
    const dashboard = this.dashboards.get(id)
    if (dashboard) {
      this.currentDashboard = dashboard
      this.storageService.saveCurrentDashboard(id)
      this.notifyObservers("onDashboardSelected", dashboard)
    }
  }

  getCurrentDashboard(): IDashboard | null {
    return this.currentDashboard
  }

  getAllDashboards(): IDashboard[] {
    return Array.from(this.dashboards.values())
  }

  addTimerToDashboard(dashboardId: string, timerId: number): void {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard) return

    if (!dashboard.timerIds.includes(timerId)) {
      const updatedDashboard: IDashboard = {
        ...dashboard,
        timerIds: [...dashboard.timerIds, timerId],
      }

      this.dashboards.set(dashboardId, updatedDashboard)
      this.storageService.saveDashboard(updatedDashboard)

      if (this.currentDashboard?.id === dashboardId) {
        this.currentDashboard = updatedDashboard
      }

      this.notifyObservers("onDashboardUpdated", updatedDashboard)
    }
  }

  removeTimerFromDashboard(dashboardId: string, timerId: number): void {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard) return

    const updatedDashboard: IDashboard = {
      ...dashboard,
      timerIds: dashboard.timerIds.filter((id) => id !== timerId),
    }

    this.dashboards.set(dashboardId, updatedDashboard)
    this.storageService.saveDashboard(updatedDashboard)

    if (this.currentDashboard?.id === dashboardId) {
      this.currentDashboard = updatedDashboard
    }

    this.notifyObservers("onDashboardUpdated", updatedDashboard)
  }

  subscribe(observer: IDashboardObserver): void {
    this.observers.add(observer)
  }

  unsubscribe(observer: IDashboardObserver): void {
    this.observers.delete(observer)
  }

  private notifyObservers(method: keyof IDashboardObserver, data: IDashboard | string): void {
    this.observers.forEach((observer) => {
      ;(observer[method] as any)(data)
    })
  }
}
