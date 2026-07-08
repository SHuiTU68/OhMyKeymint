import type { MdDialog, MdFilledButton, MdTextButton } from '@material/web/all'
import { i18n } from '../i18n'
import { Cli } from '../cli'
import type { Config } from '../config'
import { GITHUB_REPO } from '../constant'
import { applyDialogAnimation } from './animation'

export class AboutDialog {
  #dialog: MdDialog | null = null
  #cli: Cli
  #config: Config

  constructor(cli: Cli, config: Config) {
    this.#cli = cli
    this.#config = config
  }

  getElement(): DocumentFragment {
    const template = document.createElement('template')
    template.innerHTML = /* html */ `
      <md-dialog id="about-dialog">
        <div slot="headline" class="about-headline">
          <div class="about-title-row">
            <div id="module_name_line1">${i18n.t('about_module_name_line1')}</div>
            <div id="working-mode-tag">${this.#config.identity}</div>
          </div>
          <div id="module_name_line2">${i18n.t('about_module_name_line2')}</div>
          <div id="module-version"></div>
          <div id="author"><span id="authored">${i18n.t('about_by')}</span> <span id="author-name"></span></div>
        </div>
        <div slot="content">
          <div id="disclaimer">${i18n.t('about_disclaimer')}</div>
          <div class="link">
            <md-filled-button id="github">
              <span>GitHub</span>
              <svg slot="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1A10.89 10.89 0 0 0 1 11.77 10.79 10.79 0 0 0 8.52 22c.55.1.75-.23.75-.52v-1.83c-3.06.65-3.71-1.44-3.71-1.44a2.86 2.86 0 0 0-1.22-1.58c-1-.66.08-.65.08-.65a2.31 2.31 0 0 1 1.68 1.11 2.37 2.37 0 0 0 3.2.89 2.33 2.33 0 0 1 .7-1.44c-2.44-.27-5-1.19-5-5.32a4.15 4.15 0 0 1 1.11-2.91 3.78 3.78 0 0 1 .11-2.84s.93-.29 3 1.1a10.68 10.68 0 0 1 5.5 0c2.1-1.39 3-1.1 3-1.1a3.78 3.78 0 0 1 .11 2.84A4.15 4.15 0 0 1 19 11.2c0 4.14-2.58 5.05-5 5.32a2.5 2.5 0 0 1 .75 2v2.95c0 .35.2.63.75.52A10.8 10.8 0 0 0 23 11.77 10.89 10.89 0 0 0 12 1"></path></svg>
            </md-filled-button>
          </div>
          <div class="acknowledgment">
            <p id="acknowledgment">${i18n.t('about_acknowledgment')}</p>
            <p>markedjs/marked: Markdown Support</p>
          </div>
        </div>
        <div slot="actions">
          <md-text-button id="close-about">${i18n.t('functional_button_close')}</md-text-button>
        </div>
      </md-dialog>
    `

    const fragment = template.content
    this.#dialog = fragment.querySelector<MdDialog>('#about-dialog')

    this.#loadModuleInfo()

    fragment.querySelector<MdFilledButton>('#github')!.onclick = () => this.#cli.linkRedirect(`https://github.com/${GITHUB_REPO}`)
    fragment.querySelector<MdTextButton>('#close-about')!.onclick = () => this.close()

    return fragment
  }

  initAnimation(): void {
    if (this.#dialog) applyDialogAnimation(this.#dialog)
  }

  show(): void {
    this.#dialog?.show()
  }

  close(): void {
    this.#dialog?.close()
  }

  // Self-update / canary / translation-bundle update are intentionally absent:
  // this WebUI is bundled into Oh My Keymint and must not fetch or install
  // Tricky-Addon payloads (which would overwrite OMK's module.prop / locales
  // or flash an unrelated module zip). OMK is updated via its own
  // module.prop updateJson by the root manager.
  async #loadModuleInfo(): Promise<void> {
    try {
      const basePath = await this.#cli.getBasePath()
      const version = await this.#cli.grepProp('version', `${basePath}/module.prop`)
      const author = await this.#cli.grepProp('author', `${basePath}/module.prop`)
      if (import.meta.env.DEV) {
        this.#setVersion('v1.2.0 (dev)')
        this.#setAuthor('Oh My Keymint')
        return
      }
      if (version) this.#setVersion(version)
      this.#setAuthor(author || 'Oh My Keymint')
    } catch (e) {
      console.error('Failed to load module info:', e)
    }
  }

  #setVersion(value: string): void {
    const el = this.#dialog?.querySelector('#module-version')
    if (el) el.textContent = value
  }

  #setAuthor(value: string): void {
    const el = this.#dialog?.querySelector('#author-name')
    if (el) el.textContent = value
  }
}
