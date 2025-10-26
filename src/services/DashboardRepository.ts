/**
 * DashboardRepository - Single Responsibility: Handle dashboard persistence via GitHub
 *
 * Workflow:
 * 1. User creates dashboards on desktop
 * 2. Exports to GitHub as a JSON manifest file
 * 3. Other devices fetch from GitHub using the raw URL
 * 4. All devices only need to remember the GitHub URL
 * 5. Local changes can be merged and pushed back
 */

export interface IGithubConfig {
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
      duration?: number // for countdown
      alertConfig?: {
        enabled: boolean
        message: string
        repeat: "infinite" | "finite"
        repeatCount?: number
        waitBetweenRepeat: number
      }
    }>
  }>
}

export class DashboardRepository {
  private githubConfig: IGithubConfig | null = null
  private lastSyncTime: number = 0
  private cacheKey = "particularparrot_github_config"
  private manifestCacheKey = "particularparrot_manifest_cache"

  constructor() {
    this.loadGithubConfig()
  }

  /**
   * Save GitHub URL to localStorage
   */
  saveGithubUrl(rawUrl: string): void {
    // Validate it's a valid raw GitHub URL
    if (!this.isValidGithubUrl(rawUrl)) {
      throw new Error(
        "Invalid GitHub URL. Must be a raw GitHub URL: https://raw.githubusercontent.com/...",
      )
    }

    this.githubConfig = { rawUrl }
    localStorage.setItem(this.cacheKey, JSON.stringify(this.githubConfig))
  }

  /**
   * Get the current GitHub URL
   */
  getGithubUrl(): string | null {
    return this.githubConfig?.rawUrl ?? null
  }

  /**
   * Check if GitHub URL is configured
   */
  isConfigured(): boolean {
    return this.githubConfig !== null
  }

  /**
   * Clear the GitHub configuration
   */
  clearGithubConfig(): void {
    this.githubConfig = null
    localStorage.removeItem(this.cacheKey)
    localStorage.removeItem(this.manifestCacheKey)
    this.lastSyncTime = 0
  }

  /**
   * Fetch dashboards from GitHub
   */
  async fetchFromGithub(): Promise<IDashboardManifest> {
    if (!this.githubConfig) {
      throw new Error("GitHub URL not configured. Please set it first.")
    }

    try {
      const response = await fetch(this.githubConfig.rawUrl, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch from GitHub: ${response.status} ${response.statusText}`)
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
        console.warn("Failed to fetch from GitHub, using cached version:", error)
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
   * Validate GitHub URL format
   */
  private isValidGithubUrl(url: string): boolean {
    return (
      url.startsWith("https://raw.githubusercontent.com/") &&
      url.includes("/refs/heads/") &&
      url.endsWith(".json")
    )
  }

  /**
   * Load saved config from localStorage
   */
  private loadGithubConfig(): void {
    const saved = localStorage.getItem(this.cacheKey)
    if (saved) {
      try {
        this.githubConfig = JSON.parse(saved)
      } catch {
        console.warn("Failed to load saved GitHub config")
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
      url: this.getGithubUrl(),
    }
  }
}
