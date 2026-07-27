import type { MdDialog, MdFilledButton, MdOutlinedButton } from '@material/web/all'
import { i18n } from '../i18n'
import type { ConfigOhMyKeyMint } from '../config_ohmykeymint'
import { PolicyEditor } from '../app_list/policy'
import { applyDialogAnimation } from './animation'

// OMK-only: edit the [device] section of config.toml (brand, model, serial,
// IMEI/MEID, overrideTelephonyProperties). Telephony fields are optional.
export class OmkDeviceDialog {
  #dialog: MdDialog | null = null
  #policyEditor: PolicyEditor | null = null
  #config: ConfigOhMyKeyMint

  constructor(config: ConfigOhMyKeyMint) {
    this.#config = config
  }

  getElement(): DocumentFragment {
    const template = document.createElement('template')
    template.innerHTML = /* html */ `
      <md-dialog id="omk-device-dialog">
        <div slot="headline">${i18n.t('omk_device_title')}</div>
        <div slot="content">
          <div id="omk-device-fields" class="policy-fields">
            ${PolicyEditor.html(this.#config.deviceSchema)}
          </div>
        </div>
        <div slot="actions">
          <md-outlined-button id="close-omk-device">${i18n.t('functional_button_cancel')}</md-outlined-button>
          <md-filled-button id="save-omk-device">${i18n.t('functional_button_save')}</md-filled-button>
        </div>
      </md-dialog>
    `

    const fragment = template.content
    this.#dialog = fragment.querySelector<MdDialog>('#omk-device-dialog')

    const fieldsContainer = fragment.querySelector<HTMLElement>('#omk-device-fields')!
    this.#policyEditor = new PolicyEditor(fieldsContainer, this.#config.deviceSchema)
    this.#policyEditor.bind()

    fragment.querySelector<MdOutlinedButton>('#close-omk-device')!.onclick = () => this.close()
    fragment.querySelector<MdFilledButton>('#save-omk-device')!.onclick = () => this.#save()

    return fragment
  }

  initAnimation(): void {
    if (this.#dialog) applyDialogAnimation(this.#dialog)
  }

  show(): void {
    const configData = this.#config.get()
    this.#policyEditor?.setPolicy(configData.device ?? null)
    this.#dialog?.show()
  }

  close(): void {
    this.#dialog?.close()
  }

  #save(): void {
    if (!this.#policyEditor?.isValid()) return
    const policy = this.#policyEditor?.getPolicy()
    const configData = this.#config.get()
    if (policy) {
      configData.device = policy
    } else {
      delete configData.device
    }
    this.#config.write()
    this.close()
  }
}
