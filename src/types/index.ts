/**
 * Timer domain types and interfaces
 * Following ISP (Interface Segregation Principle) - clients depend only on what they need
 */

export type TimerType = "countdown" | "countup"

export interface ITimerState {
  readonly id: number
  readonly label: string
  readonly type: TimerType
  readonly isRunning: boolean
  readonly isFinished: boolean
}

export interface ICountdownTimerState extends ITimerState {
  readonly type: "countdown"
  readonly totalSeconds: number
  readonly remainingSeconds: number
}

export interface ICountupTimerState extends ITimerState {
  readonly type: "countup"
  readonly elapsedSeconds: number
}

export type TimerState = ICountdownTimerState | ICountupTimerState

export interface IDashboard {
  readonly id: string
  readonly name: string
  readonly timerIds: number[]
  readonly createdAt: number
}

export interface ITimerRuntime {
  readonly timerId: number
  readonly startedAt: number // Timestamp when timer was started (for running timers)
  readonly baseRemainingSeconds?: number // For countdown: remaining seconds at start time
  readonly baseElapsedSeconds?: number // For countup: elapsed seconds at start time
}

export interface ITimerObserver {
  onTimerUpdated(timer: TimerState): void
  onTimerCreated(timer: TimerState): void
  onTimerDeleted(id: number): void
}

export interface IDashboardObserver {
  onDashboardCreated(dashboard: IDashboard): void
  onDashboardUpdated(dashboard: IDashboard): void
  onDashboardDeleted(id: string): void
  onDashboardSelected(dashboard: IDashboard): void
}

export interface IAudioService {
  playBeep(): void
}

export interface IStorageService {
  saveDashboard(dashboard: IDashboard): void
  loadDashboard(id: string): IDashboard | null
  deleteDashboard(id: string): void
  getAllDashboards(): IDashboard[]
  saveCurrentDashboard(dashboardId: string): void
  getCurrentDashboard(): string | null
  saveTimers(timers: TimerState[]): void
  loadTimers(): TimerState[]
  saveTimerRuntime(runtime: ITimerRuntime): void
  getTimerRuntime(timerId: number): ITimerRuntime | null
  deleteTimerRuntime(timerId: number): void
}

export interface ITimerService {
  createCountdownTimer(label: string, hours: number, minutes: number, seconds: number): TimerState
  createCountupTimer(label: string): TimerState
  startTimer(id: number): void
  pauseTimer(id: number): void
  resetCountupTimer(id: number): void
  deleteTimer(id: number): void
  getTimer(id: number): TimerState | undefined
  getAllTimers(): TimerState[]
  subscribe(observer: ITimerObserver): void
  unsubscribe(observer: ITimerObserver): void
}

export interface IDashboardService {
  createDashboard(name: string): IDashboard
  deleteDashboard(id: string): void
  selectDashboard(id: string): void
  getCurrentDashboard(): IDashboard | null
  getAllDashboards(): IDashboard[]
  addTimerToDashboard(dashboardId: string, timerId: number): void
  removeTimerFromDashboard(dashboardId: string, timerId: number): void
  subscribe(observer: IDashboardObserver): void
  unsubscribe(observer: IDashboardObserver): void
}

export interface IUIRenderer {
  render(
    dashboards: IDashboard[],
    currentDashboard: IDashboard | null,
    allTimers: TimerState[],
  ): void
}
