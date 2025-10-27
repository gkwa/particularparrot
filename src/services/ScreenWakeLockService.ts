/**
 * ScreenWakeLockService - Single Responsibility: Manage Screen Wake Lock
 * Handles the browser's Screen Wake Lock API to keep the device awake
 */

import type { IScreenWakeLockService } from "../types"

export class ScreenWakeLockService implements IScreenWakeLockService {
  private wakeLock: WakeLockSentinel | null = null
  private onReleaseCallback: (() => void) | null = null

  isSupported(): boolean {
    return "wakeLock" in navigator
  }

  setOnReleaseCallback(callback: () => void): void {
    this.onReleaseCallback = callback
  }

  async acquire(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Screen Wake Lock API is not supported in this browser")
    }

    if (this.wakeLock !== null) {
      return
    }

    try {
      this.wakeLock = await navigator.wakeLock.request("screen")
      alert("Wake lock acquired! Type: " + this.wakeLock.type)

      this.wakeLock.addEventListener("release", () => {
        alert("Wake lock was released! Attempting to re-acquire...")
        this.wakeLock = null
        if (this.onReleaseCallback) {
          this.onReleaseCallback()
        }
      })
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to acquire wake lock: ${err.message}`)
      }
      throw new Error("Failed to acquire wake lock: Unknown error")
    }
  }

  async release(): Promise<void> {
    if (this.wakeLock !== null) {
      try {
        await this.wakeLock.release()
        this.wakeLock = null
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Failed to release wake lock: ${err.message}`)
        }
        throw new Error("Failed to release wake lock: Unknown error")
      }
    }
  }

  isActive(): boolean {
    return this.wakeLock !== null
  }
}

declare class WakeLockSentinel extends EventTarget {
  release(): Promise<void>
  readonly type: string
}
