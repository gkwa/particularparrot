/**
 * ManifestRepository - Single Responsibility: Handle manifest persistence via remote HTTP
 *
 * Workflow:
 * 1. User creates dashboards on desktop
 * 2. Exports to manifest file (JSON)
 * 3. Other devices fetch from remote URL
 * 4. All devices only need to remember the manifest URL
 * 5. Local changes can be merged and pushed back
 */

export interface IRemoteConfig {
  rawUrl: string // e.g., https://raw.githubusercontent.com/user/repo/refs/heads/master/dashboards.json
}

export interface IDashboardManifest {
  version: string
  exportedAt: string
  dashboards: Array<{
    id: string
    name: string
    timers: Array<{
      id: number
      label: string
      type: "countdown" | "countup"
      totalSeconds?: number // for countdown
      alertConfig?: {
        enabled: boolean
        utteranceTemplate: string
        repeatCount: "infinite" | "finite" | "once" | number
        waitBetweenRepeat: number
      }
    }>
  }>
}

export class ManifestRepository {
  private remoteConfig: IRemoteConfig | null = null
  private lastSyncTime: number = 0
  private cacheKey = "particularparrot_remote_config"
  private manifestCacheKey = "particularparrot_manifest_cache"

  constructor() {
    this.loadRemoteConfig()
  }

  /**
   * Save manifest URL to localStorage
   */
  saveManifestUrl(rawUrl: string): void {
    // Validate it's a valid HTTP(S) URL
    if (!this.isValidManifestUrl(rawUrl)) {
      throw new Error("Invalid manifest URL. Must be an HTTP(S) URL ending with .json")
    }

    this.remoteConfig = { rawUrl }
    localStorage.setItem(this.cacheKey, JSON.stringify(this.remoteConfig))
  }

  /**
   * Get the current manifest URL
   */
  getManifestUrl(): string | null {
    return this.remoteConfig?.rawUrl ?? null
  }

  /**
   * Check if manifest URL is configured
   */
  isConfigured(): boolean {
    return this.remoteConfig !== null
  }

  /**
   * Clear the remote configuration
   */
  clearRemoteConfig(): void {
    this.remoteConfig = null
    localStorage.removeItem(this.cacheKey)
    localStorage.removeItem(this.manifestCacheKey)
    this.lastSyncTime = 0
  }

  /**
   * Fetch dashboards from remote manifest
   */
  async fetchFromRemote(): Promise<IDashboardManifest> {
    if (!this.remoteConfig) {
      throw new Error("Manifest URL not configured. Please set it first.")
    }

    try {
      const response = await fetch(this.remoteConfig.rawUrl, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch from remote: ${response.status} ${response.statusText}`)
      }

      const manifest = (await response.json()) as IDashboardManifest
      this.validateManifest(manifest)

      // Cache locally
      localStorage.setItem(this.manifestCacheKey, JSON.stringify(manifest))
      this.lastSyncTime = Date.now()

      return manifest
    } catch (error) {
      // Try to return cached version if fetch fails
      const cached = this.getCachedManifest()
      if (cached) {
        console.warn("Failed to fetch from remote, using cached version:", error)
        return cached
      }
      throw error
    }
  }

  /**
   * Get last cached manifest without fetching
   */
  getCachedManifest(): IDashboardManifest | null {
    const cached = localStorage.getItem(this.manifestCacheKey)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Check if sync is needed (optional debounce)
   */
  shouldSync(debounceMs: number = 60000): boolean {
    return Date.now() - this.lastSyncTime > debounceMs
  }

  /**
   * Export dashboards as manifest JSON
   */
  exportAsJson(
    dashboards: Array<{
      id: string
      name: string
      timers: Array<any>
    }>,
  ): string {
    const manifest: IDashboardManifest = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      dashboards,
    }

    return JSON.stringify(manifest, null, 2)
  }

  /**
   * Generate a download link for the manifest
   */
  downloadManifest(content: string, filename: string = "dashboards-manifest.json"): void {
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Import dashboards from JSON file (for local file uploads)
   */
  async importFromFile(file: File): Promise<IDashboardManifest> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const manifest = JSON.parse(content) as IDashboardManifest
          this.validateManifest(manifest)
          resolve(manifest)
        } catch (error) {
          reject(new Error(`Failed to parse JSON file: ${error}`))
        }
      }
      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }
      reader.readAsText(file)
    })
  }

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: any): void {
    if (!manifest.version || !manifest.dashboards || !Array.isArray(manifest.dashboards)) {
      throw new Error("Invalid manifest format. Missing required fields.")
    }

    // Validate each dashboard
    for (const dashboard of manifest.dashboards) {
      if (!dashboard.id || !dashboard.name || !Array.isArray(dashboard.timers)) {
        throw new Error("Invalid dashboard format in manifest.")
      }
    }
  }

  /**
   * Validate manifest URL format
   */
  private isValidManifestUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === "http:" || urlObj.protocol === "https:"
    } catch {
      return false
    }
  }

  /**
   * Load saved config from localStorage
   */
  private loadRemoteConfig(): void {
    const saved = localStorage.getItem(this.cacheKey)
    if (saved) {
      try {
        this.remoteConfig = JSON.parse(saved)
      } catch {
        console.warn("Failed to load saved remote config")
      }
    }
  }

  /**
   * Get sync status info
   */
  getSyncStatus(): {
    isConfigured: boolean
    lastSyncTime: string | null
    url: string | null
  } {
    return {
      isConfigured: this.isConfigured(),
      lastSyncTime: this.lastSyncTime > 0 ? new Date(this.lastSyncTime).toLocaleString() : null,
      url: this.getManifestUrl(),
    }
  }
}
