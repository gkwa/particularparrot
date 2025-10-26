/**
 * SyncUIHandler - Single Responsibility: Render and handle remote manifest sync UI
 */

import { ManifestRepository } from "../services/ManifestRepository"

export class SyncUIHandler {
  constructor(private repository: ManifestRepository) {}

  /**
   * Render sync configuration section
   */
  renderConfigSection(): string {
    const status = this.repository.getSyncStatus()
    const url = status.url || ""
    const syncInfo = status.lastSyncTime ? `Last synced: ${status.lastSyncTime}` : "Not synced yet"

    return `
      <div class="sync-config-section">
        <h3>📤 Dashboard Sync Configuration</h3>

        <div class="sync-config-form">
          <div class="input-field" style="grid-column: 1 / -1">
            <label for="manifestUrl">Manifest URL or Local File</label>
            <input
              type="text"
              id="manifestUrl"
              placeholder="Enter URL (https://...) or click 'Load' to select a local file"
              value="${this.escapeHtml(url)}"
              class="manifest-url-input"
            />
            <small style="color: #666; margin-top: 5px; display: block">
              Save a URL to sync dashboards across devices, or load a local manifest file
            </small>
          </div>

          <div class="sync-button-group">
            <button class="btn btn-primary" id="saveManifestUrlBtn">
              💾 Save URL
            </button>
            <button class="btn btn-primary" id="loadManifestBtn">
              📥 Load
            </button>
            <button class="btn btn-secondary" id="exportBtn">
              💾 Export
            </button>
            <button class="btn btn-danger" id="clearSyncBtn" ${status.isConfigured ? "" : "disabled"}>
              🗑️ Clear
            </button>
          </div>

          <input type="file" id="fileInput" style="display: none" />

          <div class="sync-status">
            <small style="color: #999">✓ ${syncInfo}</small>
          </div>
        </div>

        <div id="syncMessage" style="display: none; margin-top: 10px"></div>
      </div>
    `
  }

  /**
   * Attach event listeners for sync configuration
   */
  attachEventListeners(
    onSaveUrl: (url: string) => Promise<void>,
    onLoad: () => Promise<void>,
    onClear: () => void,
    onExport: () => void,
    onImport: (file: File) => Promise<void>,
  ): void {
    const urlInput = document.getElementById("manifestUrl") as HTMLInputElement | null
    const saveBtn = document.getElementById("saveManifestUrlBtn") as HTMLButtonElement | null
    const loadBtn = document.getElementById("loadManifestBtn") as HTMLButtonElement | null
    const clearBtn = document.getElementById("clearSyncBtn") as HTMLButtonElement | null
    const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement | null
    const fileInput = document.getElementById("fileInput") as HTMLInputElement

    saveBtn?.addEventListener("click", async () => {
      const url = urlInput?.value.trim()

      if (!url) {
        this.showMessage("Please enter a manifest URL", "error")
        return
      }

      try {
        this.repository.saveManifestUrl(url)
        this.showMessage("✓ Manifest URL saved successfully!", "success")
        await onSaveUrl(url)
      } catch (error) {
        this.showMessage(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        )
      }
    })

    loadBtn?.addEventListener("click", async () => {
      const url = urlInput?.value.trim()

      // If URL provided and valid, load from URL
      if (url && this.isValidManifestUrl(url)) {
        try {
          this.setButtonLoading(loadBtn, true)
          this.showMessage("Loading from URL...", "info")
          await onLoad()
          this.showMessage("✓ Successfully loaded dashboards!", "success")
        } catch (error) {
          this.showMessage(
            `Error loading: ${error instanceof Error ? error.message : "Unknown error"}`,
            "error",
          )
        } finally {
          this.setButtonLoading(loadBtn, false)
        }
      } else {
        // Open file picker for local file
        fileInput?.click()
      }
    })

    clearBtn?.addEventListener("click", () => {
      if (confirm("Are you sure? This will clear the sync configuration.")) {
        this.repository.clearRemoteConfig()
        if (urlInput) urlInput.value = ""
        this.showMessage("✓ Configuration cleared", "info")
        onClear()
      }
    })

    exportBtn?.addEventListener("click", onExport)

    fileInput?.addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]

      if (!file) return

      try {
        this.setButtonLoading(loadBtn, true)
        this.showMessage("Importing dashboards from file...", "info")
        await onImport(file)
        this.showMessage("✓ Dashboards imported successfully!", "success")
      } catch (error) {
        this.showMessage(
          `Import error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        )
      } finally {
        this.setButtonLoading(loadBtn, false)
        input.value = "" // Clear file input
      }
    })
  }

  /**
   * Show status message
   */
  private showMessage(message: string, type: "success" | "error" | "info"): void {
    const messageDiv = document.getElementById("syncMessage")
    if (!messageDiv) return

    messageDiv.textContent = message
    messageDiv.className = `sync-status-message sync-status-${type}`
    messageDiv.style.display = "block"

    if (type !== "error") {
      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    }
  }

  /**
   * Set button loading state
   */
  private setButtonLoading(button: HTMLButtonElement | null, loading: boolean): void {
    if (!button) return
    if (loading) {
      button.disabled = true
      button.style.opacity = "0.6"
    } else {
      button.disabled = false
      button.style.opacity = "1"
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
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}
