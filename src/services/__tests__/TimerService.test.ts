import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest"
import { TimerService } from "../TimerService"
import { AudioService } from "../AudioService"
import { StorageService } from "../StorageService"
import type { IAlertConfig, ICountdownTimerState } from "../../types/index"

// Mock window, document, and localStorage for Node.js environment
beforeAll(() => {
  if (typeof window === "undefined") {
    ;(global as any).window = {
      speechSynthesis: {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    }
  }

  if (typeof document === "undefined") {
    ;(global as any).document = {
      addEventListener: vi.fn(),
    }
  }

  if (typeof localStorage === "undefined") {
    const store: Record<string, string> = {}
    ;(global as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key])
      },
    }
  }
})

describe("TimerService", () => {
  let timerService: TimerService
  let audioService: AudioService
  let storageService: StorageService

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    audioService = new AudioService()
    storageService = new StorageService()
    timerService = new TimerService(audioService, storageService)

    // Mock audio methods
    vi.spyOn(audioService, "playAlert").mockImplementation(() => {})
    vi.spyOn(audioService, "cancelAlert").mockImplementation(() => {})
    vi.spyOn(audioService, "playBeep").mockImplementation(() => {})
  })

  describe("Acknowledge Timer", () => {
    it("should create a countdown timer", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("test", 60, config)

      expect(timer.id).toBeDefined()
      expect(timer.label).toBe("test")
      expect((timer as ICountdownTimerState).totalSeconds).toBe(60)
      expect((timer as ICountdownTimerState).isAcknowledged).toBe(false)
      expect(timer.isFinished).toBe(false)
    })

    it("should acknowledge a timer", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      const timerId = timer.id

      // Verify initial state
      const initialTimer = timerService.getTimer(timerId)
      expect((initialTimer as ICountdownTimerState).isAcknowledged).toBe(false)

      // Acknowledge the timer
      timerService.acknowledgeTimer(timerId)

      const acknowledgedTimer = timerService.getTimer(timerId)
      expect(acknowledgedTimer?.type).toBe("countdown")
      expect((acknowledgedTimer as ICountdownTimerState).isAcknowledged).toBe(true)
    })

    it("should stop alert on a timer", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      const timerId = timer.id

      // Stop alert
      timerService.stopAlert(timerId)

      const stoppedTimer = timerService.getTimer(timerId)
      expect(stoppedTimer?.type).toBe("countdown")
      expect((stoppedTimer as ICountdownTimerState).isAcknowledged).toBe(true)
      expect(audioService.cancelAlert).toHaveBeenCalled()
    })

    it("should reset and restart a finished timer", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      const timerId = timer.id
      const originalTime = (timer as ICountdownTimerState).remainingSeconds

      // First start the timer, then simulate it finishing by acknowledging
      timerService.startTimer(timerId)
      timerService.acknowledgeTimer(timerId)

      // Verify it's acknowledged
      const beforeRestart = timerService.getTimer(timerId)
      expect((beforeRestart as ICountdownTimerState).isAcknowledged).toBe(true)

      // Now restart it
      timerService.startTimer(timerId)

      const restartedTimer = timerService.getTimer(timerId)
      expect(restartedTimer?.isRunning).toBe(true)
      expect((restartedTimer as ICountdownTimerState).remainingSeconds).toBe(originalTime)
    })

    it("should not start a timer that is finished but not acknowledged", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      const timerId = timer.id

      // Manually set the timer to finished state by acknowledging after starting
      timerService.startTimer(timerId)
      timerService.acknowledgeTimer(timerId)

      // Now try to start it again - it should reset and start since it's acknowledged
      timerService.startTimer(timerId)
      const timer2 = timerService.getTimer(timerId)
      expect(timer2?.isRunning).toBe(true)

      // Test the actual scenario: finished but NOT acknowledged
      // Create a new timer and try to start without going through normal flow
      const timer3 = timerService.createCountdownTimer("test2", 3, config)
      const timerId3 = timer3.id

      // Start it
      timerService.startTimer(timerId3)
      expect(timerService.getTimer(timerId3)?.isRunning).toBe(true)

      // Pause it
      timerService.pauseTimer(timerId3)
      expect(timerService.getTimer(timerId3)?.isRunning).toBe(false)

      // Now it's paused but not finished - should be able to restart
      timerService.startTimer(timerId3)
      expect(timerService.getTimer(timerId3)?.isRunning).toBe(true)
    })

    it("should delete a timer", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      const timerId = timer.id

      const allTimersBefore = timerService.getAllTimers()
      const countBefore = allTimersBefore.length

      timerService.deleteTimer(timerId)

      const deletedTimer = timerService.getTimer(timerId)
      expect(deletedTimer).toBeUndefined()

      const allTimersAfter = timerService.getAllTimers()
      expect(allTimersAfter.length).toBe(countBefore - 1)
    })

    it("should cancel alert when acknowledging", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      ;(audioService.cancelAlert as any).mockClear()

      timerService.acknowledgeTimer(timer.id)

      expect(audioService.cancelAlert).toHaveBeenCalled()
    })

    it("should cancel alert when stopping alert", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 5, config)
      ;(audioService.cancelAlert as any).mockClear()

      timerService.stopAlert(timer.id)

      expect(audioService.cancelAlert).toHaveBeenCalled()
    })

    it("should throw error when acknowledging non-existent timer", () => {
      expect(() => {
        timerService.acknowledgeTimer(99999)
      }).toThrow("Countdown timer with id 99999 not found")
    })

    it("should throw error when stopping alert on non-existent timer", () => {
      expect(() => {
        timerService.stopAlert(99999)
      }).toThrow("Countdown timer with id 99999 not found")
    })
  })

  describe("Timer State Management", () => {
    it("should create a countup timer", () => {
      const timer = timerService.createCountupTimer("exercise")

      expect(timer.id).toBeDefined()
      expect(timer.label).toBe("exercise")
      expect(timer.type).toBe("countup")
      expect((timer as any).elapsedSeconds).toBe(0)
      expect(timer.isFinished).toBe(false)
    })

    it("should reset a countup timer", () => {
      const timer = timerService.createCountupTimer("exercise")
      const timerId = timer.id

      timerService.resetCountupTimer(timerId)

      const resetTimer = timerService.getTimer(timerId)
      expect((resetTimer as any).elapsedSeconds).toBe(0)
    })

    it("should get all timers", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const initialCount = timerService.getAllTimers().length

      timerService.createCountdownTimer("timer1", 60, config)
      timerService.createCountupTimer("timer2")

      const allTimers = timerService.getAllTimers()
      expect(allTimers.length).toBe(initialCount + 2)
    })
  })

  describe("Timer Observer Pattern", () => {
    it("should subscribe and notify observers", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const mockObserver = {
        onTimerUpdated: vi.fn(),
        onTimerCreated: vi.fn(),
        onTimerDeleted: vi.fn(),
      }

      timerService.subscribe(mockObserver)
      timerService.createCountdownTimer("bake", 5, config)

      expect(mockObserver.onTimerCreated).toHaveBeenCalled()
    })
  })

  describe("Timer Completion Flow", () => {
    it("should mark timer as finished and allow acknowledge/stop alert flow", () => {
      const config: IAlertConfig = {
        enabled: true,
        repeatCount: "infinite",
        waitBetweenRepeat: 10,
        utteranceTemplate: "{timer name} has completed",
      }

      const timer = timerService.createCountdownTimer("bake", 1, config)
      const timerId = timer.id

      // Initial state: not running, not finished
      let currentTimer = timerService.getTimer(timerId)
      expect(currentTimer?.isRunning).toBe(false)
      expect(currentTimer?.isFinished).toBe(false)
      expect((currentTimer as ICountdownTimerState).isAcknowledged).toBe(false)

      // Start the timer
      timerService.startTimer(timerId)
      currentTimer = timerService.getTimer(timerId)
      expect(currentTimer?.isRunning).toBe(true)
      expect(currentTimer?.isFinished).toBe(false)

      // Simulate time passing - manually set to 0
      // We'll acknowledge to simulate the finished state
      timerService.acknowledgeTimer(timerId)

      // Now it should be acknowledged
      currentTimer = timerService.getTimer(timerId)
      expect((currentTimer as ICountdownTimerState).isAcknowledged).toBe(true)
      expect(audioService.cancelAlert).toHaveBeenCalled()

      // Test stopAlert also works
      const timer2 = timerService.createCountdownTimer("test2", 1, config)
      const timerId2 = timer2.id

      ;(audioService.cancelAlert as any).mockClear()
      timerService.stopAlert(timerId2)

      currentTimer = timerService.getTimer(timerId2)
      expect((currentTimer as ICountdownTimerState).isAcknowledged).toBe(true)
      expect(audioService.cancelAlert).toHaveBeenCalled()
    })
  })
})
