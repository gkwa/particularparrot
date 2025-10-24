/**
 * TimerService - Single Responsibility: Timer business logic
 * Implements ITimerService and uses Observer pattern
 * Uses timestamp-based calculation for accurate time tracking across page reloads
 */

import {
  ITimerService,
  ITimerObserver,
  TimerState,
  ICountdownTimerState,
  ICountupTimerState,
  IAudioService,
  IStorageService,
  ITimerRuntime,
} from "../types/index"

export class TimerService implements ITimerService {
  private timers: Map<number, TimerState> = new Map()
  private observers: Set<ITimerObserver> = new Set()
  private intervals: Map<number, NodeJS.Timeout> = new Map()
  private finishedTimers: Set<number> = new Set()
  private audioService: IAudioService
  private storageService: IStorageService
  private nextId = Date.now()

  constructor(audioService: IAudioService, storageService: IStorageService) {
    this.audioService = audioService
    this.storageService = storageService
    this.loadTimers()
    this.resumeRunningTimers()
  }

  private loadTimers(): void {
    const stored = this.storageService.loadTimers()
    stored.forEach((timer: TimerState) => {
      this.timers.set(timer.id, { ...timer, isRunning: false })
      if (timer.id >= this.nextId) {
        this.nextId = timer.id + 1
      }
    })
  }

  private resumeRunningTimers(): void {
    const stored = this.storageService.loadTimers()

    stored.forEach((timer: TimerState) => {
      const runtime = this.storageService.getTimerRuntime(timer.id)

      if (runtime && runtime.startedAt > 0) {
        // Timer was running - resume it and set up interval
        this.timers.set(timer.id, { ...timer, isRunning: true })
        this.startInterval(timer.id)

        // Check if timer has finished
        const currentTimer = this.getComputedTimer(timer.id)
        if (currentTimer && currentTimer.type === "countdown") {
          const countdownTimer = currentTimer as ICountdownTimerState
          if (countdownTimer.remainingSeconds <= 0) {
            this.finishedTimers.add(timer.id)
            this.audioService.playBeep()
          }
        }
      }
    })

    this.persistTimers()
  }

  private getComputedTimer(id: number): TimerState | undefined {
    const timer = this.timers.get(id)
    if (!timer) return undefined

    const runtime = this.storageService.getTimerRuntime(id)
    if (!runtime || runtime.startedAt === 0) {
      // Not running, return as-is
      return timer
    }

    // Timer is running - calculate current state based on elapsed time
    const elapsedSeconds = Math.floor((Date.now() - runtime.startedAt) / 1000)

    if (timer.type === "countdown") {
      const countdownTimer = timer as ICountdownTimerState
      const baseRemaining = runtime.baseRemainingSeconds ?? countdownTimer.remainingSeconds
      const newRemainingSeconds = Math.max(0, baseRemaining - elapsedSeconds)

      return {
        ...countdownTimer,
        remainingSeconds: newRemainingSeconds,
      } as ICountdownTimerState
    } else if (timer.type === "countup") {
      const countupTimer = timer as ICountupTimerState
      const baseElapsed = runtime.baseElapsedSeconds ?? countupTimer.elapsedSeconds
      const newElapsedSeconds = baseElapsed + elapsedSeconds

      return {
        ...countupTimer,
        elapsedSeconds: newElapsedSeconds,
      } as ICountupTimerState
    }

    return timer
  }

  private startInterval(timerId: number): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(timerId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(() => {
      this.tickTimer(timerId)
    }, 1000)

    this.intervals.set(timerId, interval)
  }

  private tickTimer(timerId: number): void {
    const currentTimer = this.getComputedTimer(timerId)
    if (!currentTimer) return

    // Check if countdown timer finished
    if (currentTimer.type === "countdown") {
      const countdownTimer = currentTimer as ICountdownTimerState
      if (countdownTimer.remainingSeconds <= 0 && !this.finishedTimers.has(timerId)) {
        this.finishedTimers.add(timerId)
        this.pauseTimer(timerId)
        this.audioService.playBeep()
        const finishedTimer: ICountdownTimerState = {
          ...countdownTimer,
          remainingSeconds: 0,
          isRunning: false,
          isFinished: true,
        }
        this.notifyObservers("onTimerUpdated", finishedTimer)
        return
      }
    }

    // Notify observers with current computed state (triggers UI update)
    this.notifyObservers("onTimerUpdated", currentTimer)
  }

  private getNextId(): number {
    return this.nextId++
  }

  createCountdownTimer(
    label: string,
    hours: number,
    minutes: number,
    seconds: number,
  ): ICountdownTimerState {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    if (totalSeconds <= 0) {
      throw new Error("Total time must be greater than 0")
    }

    const id = this.getNextId()
    const timer: ICountdownTimerState = {
      id,
      label,
      type: "countdown",
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: false,
      isFinished: false,
    }

    this.timers.set(id, timer)
    this.persistTimers()
    this.notifyObservers("onTimerCreated", timer)
    return timer
  }

  createCountupTimer(label: string): ICountupTimerState {
    const id = this.getNextId()
    const timer: ICountupTimerState = {
      id,
      label,
      type: "countup",
      elapsedSeconds: 0,
      isRunning: false,
      isFinished: false,
    }

    this.timers.set(id, timer)
    this.persistTimers()
    this.notifyObservers("onTimerCreated", timer)
    return timer
  }

  startTimer(id: number): void {
    const timer = this.timers.get(id)
    if (!timer) {
      throw new Error(`Timer with id ${id} not found`)
    }

    if (timer.type === "countdown" && timer.isFinished) {
      return
    }

    if (timer.isRunning) {
      this.pauseTimer(id)
    } else {
      this.resumeTimer(id)
    }
  }

  private resumeTimer(id: number): void {
    const timer = this.timers.get(id)
    if (!timer) return

    const currentTimer = this.getComputedTimer(id)
    if (!currentTimer) return

    const updatedTimer = { ...currentTimer, isRunning: true }
    this.timers.set(id, updatedTimer)
    this.finishedTimers.delete(id)

    // Build runtime object with proper values
    const runtimeData: {
      timerId: number
      startedAt: number
      baseRemainingSeconds?: number
      baseElapsedSeconds?: number
    } = {
      timerId: id,
      startedAt: Date.now(),
    }

    if (currentTimer.type === "countdown") {
      const countdownTimer = currentTimer as ICountdownTimerState
      runtimeData.baseRemainingSeconds = countdownTimer.remainingSeconds
    } else if (currentTimer.type === "countup") {
      const countupTimer = currentTimer as ICountupTimerState
      runtimeData.baseElapsedSeconds = countupTimer.elapsedSeconds
    }

    const runtime: ITimerRuntime = runtimeData
    this.storageService.saveTimerRuntime(runtime)
    this.startInterval(id)
    this.persistTimers()
    this.notifyObservers("onTimerUpdated", updatedTimer)
  }

  pauseTimer(id: number): void {
    const timer = this.timers.get(id)
    if (!timer) return

    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(id)
    }

    // Get the computed current state and save it
    const currentTimer = this.getComputedTimer(id)
    if (!currentTimer) return

    const updatedTimer = { ...currentTimer, isRunning: false }
    this.timers.set(id, updatedTimer)

    // Clear runtime - timer is now paused
    this.storageService.deleteTimerRuntime(id)

    this.persistTimers()
    this.notifyObservers("onTimerUpdated", updatedTimer)
  }

  resetCountupTimer(id: number): void {
    const timer = this.timers.get(id)
    if (!timer || timer.type !== "countup") {
      throw new Error("Can only reset countup timers")
    }

    this.pauseTimer(id)

    const countupTimer = timer as ICountupTimerState
    const updatedTimer: ICountupTimerState = {
      ...countupTimer,
      elapsedSeconds: 0,
      isRunning: false,
    }

    this.timers.set(id, updatedTimer)
    this.storageService.deleteTimerRuntime(id)
    this.finishedTimers.delete(id)
    this.persistTimers()
    this.notifyObservers("onTimerUpdated", updatedTimer)
  }

  deleteTimer(id: number): void {
    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(id)
    }

    this.timers.delete(id)
    this.storageService.deleteTimerRuntime(id)
    this.finishedTimers.delete(id)
    this.persistTimers()
    this.notifyObservers("onTimerDeleted", id)
  }

  getTimer(id: number): TimerState | undefined {
    return this.getComputedTimer(id)
  }

  getAllTimers(): TimerState[] {
    return Array.from(this.timers.keys()).map((id) => this.getComputedTimer(id)!)
  }

  subscribe(observer: ITimerObserver): void {
    this.observers.add(observer)
  }

  unsubscribe(observer: ITimerObserver): void {
    this.observers.delete(observer)
  }

  private persistTimers(): void {
    const timers = Array.from(this.timers.values())
    this.storageService.saveTimers(timers)
  }

  private notifyObservers(method: keyof ITimerObserver, data: TimerState | number): void {
    this.observers.forEach((observer) => {
      if (method === "onTimerDeleted") {
        observer.onTimerDeleted(data as number)
      } else {
        ;(observer[method] as any)(data)
      }
    })
  }
}
