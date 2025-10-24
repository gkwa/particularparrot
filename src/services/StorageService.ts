/**
 * StorageService - Single Responsibility: Persist dashboards and timers to localStorage
 */

import { IDashboard, IStorageService, TimerState } from "../types/index"

const STORAGE_KEY_DASHBOARDS = "multi-timer-dashboards"
const STORAGE_KEY_TIMERS = "multi-timer-timers"
const CURRENT_DASHBOARD_KEY = "multi-timer-current-dashboard"

export class StorageService implements IStorageService {
  saveDashboard(dashboard: IDashboard): void {
    try {
      const dashboards = this.getAllDashboards()
      const index = dashboards.findIndex((d) => d.id === dashboard.id)

      if (index >= 0) {
        dashboards[index] = dashboard
      } else {
        dashboards.push(dashboard)
      }

      localStorage.setItem(STORAGE_KEY_DASHBOARDS, JSON.stringify(dashboards))
    } catch (error) {
      console.error("Failed to save dashboard:", error)
    }
  }

  loadDashboard(id: string): IDashboard | null {
    try {
      const dashboards = this.getAllDashboards()
      return dashboards.find((d) => d.id === id) || null
    } catch (error) {
      console.error("Failed to load dashboard:", error)
      return null
    }
  }

  deleteDashboard(id: string): void {
    try {
      const dashboards = this.getAllDashboards()
      const filtered = dashboards.filter((d) => d.id !== id)
      localStorage.setItem(STORAGE_KEY_DASHBOARDS, JSON.stringify(filtered))
    } catch (error) {
      console.error("Failed to delete dashboard:", error)
    }
  }

  getAllDashboards(): IDashboard[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DASHBOARDS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load dashboards:", error)
      return []
    }
  }

  saveCurrentDashboard(dashboardId: string): void {
    try {
      localStorage.setItem(CURRENT_DASHBOARD_KEY, dashboardId)
    } catch (error) {
      console.error("Failed to save current dashboard:", error)
    }
  }

  getCurrentDashboard(): string | null {
    try {
      return localStorage.getItem(CURRENT_DASHBOARD_KEY)
    } catch (error) {
      console.error("Failed to load current dashboard:", error)
      return null
    }
  }

  saveTimers(timers: TimerState[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timers))
    } catch (error) {
      console.error("Failed to save timers:", error)
    }
  }

  loadTimers(): TimerState[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TIMERS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load timers:", error)
      return []
    }
  }
}
