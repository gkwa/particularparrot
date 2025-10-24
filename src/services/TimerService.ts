/**
 * TimerService - Single Responsibility: Timer business logic
 * Implements ITimerService and uses Observer pattern
 * Dependency Inversion: depends on IAudioService interface, not concrete implementation
 */

import {
  ITimerService,
  ITimerObserver,
  TimerState,
  ICountdownTimerState,
  ICountupTimerState,
  IAudioService,
  IStorageService,
} from "../types/index"

export class TimerService implements ITimerService {
  private timers: Map<number, TimerState> = new Map()
  private observers: Set<ITimerObserver> = new Set()
  private intervals: Map<number, NodeJS.Timeout> = new Map()
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
    const runningTimerIds = this.getRunningTimerIds()

    runningTimerIds.forEach((timerId) => {
      const timer = this.timers.get(timerId)
      if (timer && timer.type === "countdown") {
        // Calculate how much time has passed since page was closed
        const timeSinceTimerStopped = this.getTimeSinceStop(timerId)
        const countdownTimer = timer as ICountdownTimerState

        const newRemainingSeconds = Math.max(
          0,
          countdownTimer.remainingSeconds - timeSinceTimerStopped,
        )

        if (newRemainingSeconds <= 0) {
          const finishedTimer: ICountdownTimerState = {
            ...countdownTimer,
            remainingSeconds: 0,
            isRunning: false,
            isFinished: true,
          }
          this.timers.set(timerId, finishedTimer)
          this.audioService.playBeep()
        } else {
          const updatedTimer: ICountdownTimerState = {
            ...countdownTimer,
            remainingSeconds: newRemainingSeconds,
            isRunning: true,
          }
          this.timers.set(timerId, updatedTimer)
          this.resumeTimer(timerId)
        }
      } else if (timer && timer.type === "countup") {
        // Resume countup timer
        const updatedTimer: ICountupTimerState = {
          ...timer,
          isRunning: true,
        }
        this.timers.set(timerId, updatedTimer)
        this.resumeTimer(timerId)
      }
    })

    this.persistTimers()
  }

  private getRunningTimerIds(): number[] {
    try {
      const stored = localStorage.getItem("multi-timer-running-ids")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private getTimeSinceStop(timerId: number): number {
    try {
      const stored = localStorage.getItem(`multi-timer-stop-time-${timerId}`)
      if (!stored) return 0

      const stopTime = parseInt(stored, 10)
      const now = Date.now()
      return Math.floor((now - stopTime) / 1000) // Convert to seconds
    } catch {
      return 0
    }
  }

  private saveRunningTimerIds(): void {
    try {
      const runningIds = Array.from(this.intervals.keys())
      localStorage.setItem("multi-timer-running-ids", JSON.stringify(runningIds))
    } catch (error) {
      console.error("Failed to save running timer IDs:", error)
    }
  }

  private saveTimerStopTime(timerId: number): void {
    try {
      localStorage.setItem(`multi-timer-stop-time-${timerId}`, String(Date.now()))
    } catch (error) {
      console.error("Failed to save timer stop time:", error)
    }
  }

  private clearTimerStopTime(timerId: number): void {
    try {
      localStorage.removeItem(`multi-timer-stop-time-${timerId}`)
    } catch (error) {
      console.error("Failed to clear timer stop time:", error)
    }
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

    const updatedTimer = { ...timer, isRunning: true }
    this.timers.set(id, updatedTimer)
    this.clearTimerStopTime(id)

    const interval = setInterval(() => {
      this.tickTimer(id)
    }, 1000)

    this.intervals.set(id, interval)
    this.saveRunningTimerIds()
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

    const updatedTimer = { ...timer, isRunning: false }
    this.timers.set(id, updatedTimer)
    this.saveTimerStopTime(id)
    this.saveRunningTimerIds()
    this.persistTimers()
    this.notifyObservers("onTimerUpdated", updatedTimer)
  }

  private tickTimer(id: number): void {
    const timer = this.timers.get(id)
    if (!timer) return

    let updatedTimer = { ...timer }

    if (timer.type === "countdown") {
      const countdownTimer = timer as ICountdownTimerState
      updatedTimer = { ...countdownTimer, remainingSeconds: countdownTimer.remainingSeconds - 1 }

      if ((updatedTimer as ICountdownTimerState).remainingSeconds <= 0) {
        updatedTimer = { ...updatedTimer, remainingSeconds: 0, isRunning: false, isFinished: true }
        this.pauseTimer(id)
        this.audioService.playBeep()
      }
    } else if (timer.type === "countup") {
      const countupTimer = timer as ICountupTimerState
      updatedTimer = { ...countupTimer, elapsedSeconds: countupTimer.elapsedSeconds + 1 }
    }

    this.timers.set(id, updatedTimer)
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
    this.clearTimerStopTime(id)
    this.saveRunningTimerIds()
    this.persistTimers()
    this.notifyObservers("onTimerDeleted", id)
  }

  getTimer(id: number): TimerState | undefined {
    return this.timers.get(id)
  }

  getAllTimers(): TimerState[] {
    return Array.from(this.timers.values())
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
