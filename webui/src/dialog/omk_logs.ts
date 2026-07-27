import type { MdDialog, MdOutlinedButton, MdFilledButton, MdOutlinedTextField } from '@material/web/all'
import { exec } from 'kernelsu-alt'
import { i18n } from '../i18n'
import type { ConfigOhMyKeyMint } from '../config_ohmykeymint'
import type { Snackbar } from '../snackbar/snackbar'
import { File } from '../file'
import { applyDialogAnimation } from './animation'

// OMK-only: list and view log files under /data/misc/keystore/omk/logs.
export class OmkLogsDialog {
  #dialog: MdDialog | null = null
  #config: ConfigOhMyKeyMint
  #snackbar: Snackbar

  constructor(config: ConfigOhMyKeyMint, snackbar: Snackbar) {
    this.#config = config
    this.#snackbar = snackbar
  }

  getElement(): DocumentFragment {
    const template = document.createElement('template')
    template.innerHTML = /* html */ `
      <md-dialog id="omk-logs-dialog">
        <div slot="headline">${i18n.t('omk_logs_title')}</div>
        <div slot="content" class="omk-logs-content">
          <div id="omk-logs-list" class="omk-logs-list"></div>
          <md-outlined-text-field id="omk-logs-viewer" type="textarea" rows="16" monospace readonly></md-outlined-text-field>
        </div>
        <div slot="actions">
          <md-outlined-button id="refresh-omk-logs">${i18n.t('omk_logs_refresh')}</md-outlined-button>
          <md-filled-button id="close-omk-logs">${i18n.t('functional_button_close')}</md-filled-button>
        </div>
      </md-dialog>
    `

    const fragment = template.content
    this.#dialog = fragment.querySelector<MdDialog>('#omk-logs-dialog')

    fragment.querySelector<MdOutlinedButton>('#refresh-omk-logs')!.onclick = () => this.#refresh()
    fragment.querySelector<MdFilledButton>('#close-omk-logs')!.onclick = () => this.close()

    return fragment
  }

  initAnimation(): void {
    if (this.#dialog) applyDialogAnimation(this.#dialog)
  }

  async show(): Promise<void> {
    await this.#refresh()
    this.#dialog?.show()
  }

  close(): void {
    this.#dialog?.close()
  }

  async #refresh(): Promise<void> {
    const listEl = this.#dialog?.querySelector<HTMLElement>('#omk-logs-list')
    const viewer = this.#dialog?.querySelector<MdOutlinedTextField>('#omk-logs-viewer')
    if (viewer) viewer.value = ''
    if (!listEl) return
    listEl.innerHTML = `<div class="omk-logs-empty">${i18n.t('omk_logs_loading')}</div>`

    let files: string[] = []
    try {
      const result = await exec(`ls -1 '${this.#config.logDir}' 2>/dev/null | sort -r`)
      if (result.errno === 0) {
        files = result.stdout.split('\n').map(f => f.trim()).filter(f => f.length > 0)
      }
    } catch {
      files = []
    }

    if (files.length === 0) {
      listEl.innerHTML = `<div class="omk-logs-empty">${i18n.t('omk_logs_empty')}</div>`
      return
    }

    listEl.innerHTML = ''
    for (const name of files) {
      const item = document.createElement('div')
      item.className = 'omk-logs-item'
      item.textContent = name
      item.onclick = () => this.#view(name)
      listEl.appendChild(item)
    }
  }

  async #view(name: string): Promise<void> {
    const viewer = this.#dialog?.querySelector<MdOutlinedTextField>('#omk-logs-viewer')
    if (!viewer) return
    try {
      viewer.value = await File.read(`${this.#config.logDir}/${name}`)
    } catch (e) {
      viewer.value = `Failed to read ${name}: ${e instanceof Error ? e.message : String(e)}`
      this.#snackbar.show(i18n.t('omk_logs_read_error'), false)
    }
  }
}
