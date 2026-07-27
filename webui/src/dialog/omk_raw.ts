import type { MdDialog, MdFilledButton, MdOutlinedButton, MdOutlinedTextField, MdTabs } from '@material/web/all'
import { i18n } from '../i18n'
import type { ConfigOhMyKeyMint } from '../config_ohmykeymint'
import type { Snackbar } from '../snackbar/snackbar'
import { applyDialogAnimation } from './animation'

// OMK-only: advanced raw editor for config.toml and injector.toml.
// Edits go through the ConfigOhMyKeyMint raw accessors so the in-memory state
// stays consistent with whatever the user writes.
export class OmkRawConfigDialog {
  #dialog: MdDialog | null = null
  #config: ConfigOhMyKeyMint
  #snackbar: Snackbar
  #activeTab: 'config' | 'injector' = 'config'

  constructor(config: ConfigOhMyKeyMint, snackbar: Snackbar) {
    this.#config = config
    this.#snackbar = snackbar
  }

  getElement(): DocumentFragment {
    const template = document.createElement('template')
    template.innerHTML = /* html */ `
      <md-dialog id="omk-raw-dialog">
        <div slot="headline">${i18n.t('omk_raw_title')}</div>
        <div slot="content">
          <md-tabs id="omk-raw-tabs">
            <md-primary-tab id="tab-config" aria-selected="true">
              <md-icon slot="icon">settings</md-icon>
              ${i18n.t('omk_raw_tab_config')}
            </md-primary-tab>
            <md-primary-tab id="tab-injector">
              <md-icon slot="icon">filter_alt</md-icon>
              ${i18n.t('omk_raw_tab_injector')}
            </md-primary-tab>
          </md-tabs>
          <md-outlined-text-field id="omk-raw-editor" type="textarea" rows="16" monospace></md-outlined-text-field>
        </div>
        <div slot="actions">
          <md-outlined-button id="close-omk-raw">${i18n.t('functional_button_close')}</md-outlined-button>
          <md-filled-button id="save-omk-raw">${i18n.t('functional_button_save')}</md-filled-button>
        </div>
      </md-dialog>
    `

    const fragment = template.content
    this.#dialog = fragment.querySelector<MdDialog>('#omk-raw-dialog')

    const tabs = fragment.querySelector<MdTabs>('#omk-raw-tabs')!
    tabs.addEventListener('change', () => {
      const active = (tabs.activeTabIndex ?? 0) === 0 ? 'config' : 'injector'
      this.#loadTab(active)
    })

    fragment.querySelector<MdOutlinedButton>('#close-omk-raw')!.onclick = () => this.close()
    fragment.querySelector<MdFilledButton>('#save-omk-raw')!.onclick = () => this.#save()

    return fragment
  }

  initAnimation(): void {
    if (this.#dialog) applyDialogAnimation(this.#dialog)
  }

  async show(): Promise<void> {
    this.#activeTab = 'config'
    const tabs = this.#dialog?.querySelector<MdTabs>('#omk-raw-tabs')
    if (tabs) tabs.activeTabIndex = 0
    await this.#loadTab('config')
    this.#dialog?.show()
  }

  close(): void {
    this.#dialog?.close()
  }

  async #loadTab(which: 'config' | 'injector'): Promise<void> {
    this.#activeTab = which
    const editor = this.#dialog?.querySelector<MdOutlinedTextField>('#omk-raw-editor')
    if (!editor) return
    try {
      editor.value = which === 'config'
        ? await this.#config.getRawConfig()
        : await this.#config.getRawInjector()
    } catch {
      editor.value = ''
    }
  }

  async #save(): Promise<void> {
    const editor = this.#dialog?.querySelector<MdOutlinedTextField>('#omk-raw-editor')
    if (!editor) return
    try {
      const raw = editor.value
      if (this.#activeTab === 'config') {
        await this.#config.setRawConfig(raw)
      } else {
        await this.#config.setRawInjector(raw)
      }
      // Refresh structured state so the app list / dialogs reflect the raw edit.
      await this.#config.read()
      this.#snackbar.show(i18n.t('omk_raw_saved'))
    } catch {
      this.#snackbar.show(i18n.t('omk_raw_save_error'), false)
    }
    this.close()
  }
}
