/**
 * Type Definitions and Interfaces - Single Responsibility: Define contracts
 * Following Interface Segregation Principle (ISP)
 */

export interface ICountdownTimerState {
  readonly id: number
  readonly label: string
  readonly type: "countdown"
  readonly totalSeconds: number
  readonly remainingSeconds: number
  readonly isRunning: boolean
  readonly isFinished: boolean
  readonly isAcknowledged: boolean
  readonly alertConfig: IAlertConfig
}

export interface ICountupTimerState {
  readonly id: number
  readonly label: string
  readonly type: "countup"
  readonly elapsedSeconds: number
  readonly isRunning: boolean
  readonly isFinished: boolean
}

export type TimerState = ICountdownTimerState | ICountupTimerState

export interface IAlertConfig {
  readonly enabled: boolean
  readonly repeatCount: number | "infinite"
  readonly waitBetweenRepeat: number
  readonly utteranceTemplate: string
}

export interface IDashboard {
  readonly id: string
  readonly name: string
  readonly timerIds: readonly number[]
  readonly createdAt: number
}

export interface ITimerRuntime {
  readonly timerId: number
  readonly startedAt: number
  readonly baseRemainingSeconds?: number
  readonly baseElapsedSeconds?: number
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
  playAlert(timerName: string, config: IAlertConfig): void
  cancelAlert(): void
}

export interface IScreenWakeLockService {
  isSupported(): boolean
  acquire(): Promise<void>
  release(): Promise<void>
  isActive(): boolean
  setOnReleaseCallback(callback: () => void): void
}

export interface IScreenWakeLockUIController {
  initialize(): void
  updateStatus(isActive: boolean): void
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
  createCountdownTimer(label: string, totalSeconds: number, alertConfig?: IAlertConfig): TimerState
  createCountupTimer(label: string): TimerState
  startTimer(id: number): void
  pauseTimer(id: number): void
  resetCountdownTimer(id: number): void
  resetCountupTimer(id: number): void
  deleteTimer(id: number): void
  acknowledgeTimer(id: number): void
  stopAlert(id: number): void
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
