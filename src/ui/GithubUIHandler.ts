/**
 * GithubUIHandler - Single Responsibility: Render and handle GitHub URL configuration UI
 */

import { DashboardRepository } from "../services/DashboardRepository"

export class GithubUIHandler {
  constructor(private repository: DashboardRepository) {}

  /**
   * Render GitHub configuration section
   */
  renderConfigSection(): string {
    const status = this.repository.getSyncStatus()
    const url = status.url || ""
    const configuredClass = status.isConfigured ? "configured" : "not-configured"
    const syncInfo = status.lastSyncTime ? `Last synced: ${status.lastSyncTime}` : "Not synced yet"

    return `
      <div class="github-config-section ${configuredClass}">
        <h3>📤 GitHub Sync Configuration</h3>

        <div class="github-config-form">
          <div class="input-field" style="grid-column: 1 / -1">
            <label for="githubUrl">GitHub Raw URL</label>
            <input
              type="text"
              id="githubUrl"
              placeholder="e.g., https://raw.githubusercontent.com/user/repo/refs/heads/master/dashboards.json"
              value="${this.escapeHtml(url)}"
              class="github-url-input"
            />
            <small style="color: #666; margin-top: 5px; display: block">
              The only thing you need to remember! This will be saved locally and used to sync dashboards across devices.
            </small>
          </div>

          <div class="github-button-group">
            <button class="btn btn-primary" id="saveGithubUrlBtn">
              💾 Save GitHub URL
            </button>
            <button class="btn btn-secondary" id="fetchGithubBtn" ${!status.isConfigured ? "disabled" : ""}>
              📥 Fetch from GitHub
            </button>
            <button class="btn btn-danger" id="clearGithubBtn" ${!status.isConfigured ? "disabled" : ""}>
              🗑️ Clear Configuration
            </button>
          </div>

          <div class="github-export-import">
            <button class="btn btn-secondary" id="exportBtn">
              💾 Export as JSON
            </button>
            <button class="btn btn-secondary" id="importBtn">
              📁 Import from File
            </button>
            <input type="file" id="fileInput" accept=".json" style="display: none" />
          </div>

          <div class="github-status">
            <small style="color: #999">✓ ${syncInfo}</small>
          </div>
        </div>

        <div id="syncMessage" style="display: none; margin-top: 10px"></div>
      </div>
    `
  }

  /**
   * Attach event listeners for GitHub configuration
   */
  attachEventListeners(
    onSaveUrl: (url: string) => Promise<void>,
    onFetch: () => Promise<void>,
    onClear: () => void,
    onExport: () => void,
    onImport: (file: File) => Promise<void>,
  ): void {
    const saveBtn = document.getElementById("saveGithubUrlBtn") as HTMLButtonElement | null
    const fetchBtn = document.getElementById("fetchGithubBtn") as HTMLButtonElement | null
    const clearBtn = document.getElementById("clearGithubBtn") as HTMLButtonElement | null
    const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement | null
    const importBtn = document.getElementById("importBtn") as HTMLButtonElement | null
    const fileInput = document.getElementById("fileInput") as HTMLInputElement

    saveBtn?.addEventListener("click", async () => {
      const urlInput = document.getElementById("githubUrl") as HTMLInputElement
      const url = urlInput.value.trim()

      if (!url) {
        this.showMessage("Please enter a GitHub URL", "error")
        return
      }

      try {
        this.repository.saveGithubUrl(url)
        this.showMessage("✓ GitHub URL saved successfully!", "success")
        await onSaveUrl(url)
      } catch (error) {
        this.showMessage(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        )
      }
    })

    fetchBtn?.addEventListener("click", async () => {
      try {
        this.setButtonLoading(fetchBtn, true)
        this.showMessage("Fetching from GitHub...", "info")
        await onFetch()
        this.showMessage("✓ Successfully fetched dashboards from GitHub!", "success")
      } catch (error) {
        this.showMessage(
          `Error fetching: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        )
      } finally {
        this.setButtonLoading(fetchBtn, false)
      }
    })

    clearBtn?.addEventListener("click", () => {
      if (confirm("Are you sure? This will clear the GitHub configuration.")) {
        this.repository.clearGithubConfig()
        this.showMessage("✓ Configuration cleared", "info")
        onClear()
      }
    })

    exportBtn?.addEventListener("click", onExport)

    importBtn?.addEventListener("click", () => {
      fileInput?.click()
    })

    fileInput?.addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]

      if (!file) return

      try {
        this.setButtonLoading(importBtn, true)
        this.showMessage("Importing dashboards...", "info")
        await onImport(file)
        this.showMessage("✓ Dashboards imported successfully!", "success")
      } catch (error) {
        this.showMessage(
          `Import error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        )
      } finally {
        this.setButtonLoading(importBtn, false)
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
    messageDiv.className = `github-status-message github-status-${type}`
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
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}
