/**
 * AudioService - Single Responsibility: Play audio feedback
 * Implements IAudioService interface
 */

import { IAudioService, IAlertConfig } from "../types/index"

export class AudioService implements IAudioService {
  private audioContext: AudioContext | null = null
  private repeatTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private googleUSVoice: SpeechSynthesisVoice | null = null
  private voicesLoaded = false
  private isInitialized = false

  constructor() {
    this.initializeVoices()
    this.setupInteractionListener()
  }

  private setupInteractionListener(): void {
    // Request permission to use speech synthesis on first user interaction
    const enableSpeechOnInteraction = () => {
      // Try to resume audio context if needed
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch((e) => console.warn("Could not resume audio context:", e))
      }
      this.isInitialized = true
      document.removeEventListener("click", enableSpeechOnInteraction)
      document.removeEventListener("touchstart", enableSpeechOnInteraction)
    }

    document.addEventListener("click", enableSpeechOnInteraction)
    document.addEventListener("touchstart", enableSpeechOnInteraction)
  }

  private initializeVoices(): void {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      this.findGoogleUSVoice(voices)
      this.voicesLoaded = true
    }

    // Handle voice list changes
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices()
      this.findGoogleUSVoice(voices)
      this.voicesLoaded = true
    }
  }

  private findGoogleUSVoice(voices: SpeechSynthesisVoice[]): void {
    // Try to find Google US English voice at index 49 first (as in the example)
    if (voices.length > 49 && voices[49]) {
      const voiceAt49 = voices[49]
      if (voiceAt49.name.includes("Google") || voiceAt49.name.includes("English")) {
        this.googleUSVoice = voiceAt49
        return
      }
    }

    // Try to find Google US English voice by name
    const googleVoice = voices.find(
      (voice) => voice.name === "Google US English" || voice.name.includes("Google US English"),
    )

    if (googleVoice) {
      this.googleUSVoice = googleVoice
    } else {
      // Fallback to any en-US voice
      const enUSVoice = voices.find((voice) => voice.lang === "en-US")
      if (enUSVoice) {
        this.googleUSVoice = enUSVoice
      } else if (voices.length > 0) {
        this.googleUSVoice = voices[0]
      }
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  playBeep(): void {
    try {
      const audioContext = this.getAudioContext()

      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        audioContext.resume().catch((e) => console.warn("Could not resume audio context:", e))
      }

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 1000
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.error("Failed to play beep:", error)
    }
  }

  playAlert(timerName: string, config: IAlertConfig): void {
    if (!config || !config.enabled) {
      return
    }

    // Wait for user interaction if not initialized yet
    if (!this.isInitialized) {
      console.warn("Speech synthesis not yet initialized. Waiting for user interaction...")
      return
    }

    this.cancelAlert()

    // Build the message from the template
    const message = this.buildUtteranceMessage(timerName, config.utteranceTemplate)
    this.speakMessage(message, timerName, config, 0)
  }

  private buildUtteranceMessage(timerName: string, template: string): string {
    return template.replace(/{timer name}/g, timerName)
  }

  private speakMessage(
    message: string,
    timerName: string,
    config: IAlertConfig,
    repetitionCount: number,
  ): void {
    try {
      // Ensure voices are loaded
      if (!this.voicesLoaded) {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          this.findGoogleUSVoice(voices)
          this.voicesLoaded = true
        }
      }

      // Check if speech synthesis is available and ready
      if (!window.speechSynthesis) {
        console.warn("Speech synthesis not available")
        return
      }

      // Cancel any ongoing speech first
      try {
        window.speechSynthesis.cancel()
      } catch (e) {
        console.warn("Could not cancel previous speech:", e)
      }

      const utterance = new SpeechSynthesisUtterance(message)

      // Set the Google US English voice if available
      if (this.googleUSVoice) {
        utterance.voice = this.googleUSVoice
      }

      // Configure speech properties
      try {
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
      } catch (e) {
        console.warn("Could not set speech properties:", e)
      }

      // Handle end of utterance
      utterance.onend = () => {
        const repeatsRemaining =
          config.repeatCount === "infinite" ? Infinity : config.repeatCount - repetitionCount - 1

        if (repeatsRemaining > 0) {
          // Schedule next repetition
          const timeoutId = setTimeout(() => {
            const nextMessage = this.buildUtteranceMessage(timerName, config.utteranceTemplate)
            this.speakMessage(nextMessage, timerName, config, repetitionCount + 1)
          }, config.waitBetweenRepeat * 1000)

          this.repeatTimeouts.set(`${timerName}-${repetitionCount + 1}`, timeoutId)
        }
      }

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error("Speech synthesis error:", event.error)

        // Handle specific errors gracefully
        if (event.error === "not-allowed") {
          console.warn(
            "Speech synthesis blocked by browser. Click on the page to enable audio features.",
          )
        }
      }

      // Attempt to speak
      try {
        window.speechSynthesis.speak(utterance)
      } catch (e) {
        console.error("Failed to call speak():", e)
      }
    } catch (error) {
      console.error("Failed to play audio alert:", error)
    }
  }

  cancelAlert(): void {
    try {
      window.speechSynthesis.cancel()

      // Clear all pending timeouts
      this.repeatTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      this.repeatTimeouts.clear()
    } catch (error) {
      console.error("Failed to cancel alert:", error)
    }
  }
}
