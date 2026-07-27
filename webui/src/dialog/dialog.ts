import { Cli } from '../cli'
import type { UpdateManager } from '../update'
import type { Snackbar } from '../snackbar/snackbar'
import { Config } from '../config'
import { ConfigOhMyKeyMint } from '../config_ohmykeymint'
import { AppList } from '../app_list/app_list'
import { DefaultPolicyDialog } from './policy'
import { AboutDialog } from './about'
import { HelpDialog } from './help'
import { UninstallDialog } from './uninstall'
import { SystemAppDialog } from './system_app'
import { PropDialog } from './prop'
import { UpdateDialog } from './update'
import { I18nDialog } from './i18n'
import { OmkDeviceDialog } from './omk_device'
import { OmkRawConfigDialog } from './omk_raw'
import { OmkLogsDialog } from './omk_logs'
import './dialog.scss'

export class DialogController {
  readonly about: AboutDialog
  readonly help: HelpDialog
  readonly uninstall: UninstallDialog
  readonly defaultPolicy: DefaultPolicyDialog
  readonly systemApp: SystemAppDialog
  readonly prop: PropDialog
  readonly update: UpdateDialog
  readonly i18nDialog: I18nDialog
  readonly omkDevice?: OmkDeviceDialog
  readonly omkRawConfig?: OmkRawConfigDialog
  readonly omkLogs?: OmkLogsDialog

  constructor(cli: Cli, config: Config, updateManager: UpdateManager, snackbar: Snackbar, appList: AppList) {
    this.about = new AboutDialog(cli, updateManager, snackbar, config)
    this.help = new HelpDialog(cli)
    this.uninstall = new UninstallDialog(cli, snackbar)
    this.defaultPolicy = new DefaultPolicyDialog(config)
    this.systemApp = new SystemAppDialog(appList)
    this.prop = new PropDialog(cli, config, snackbar)
    this.update = new UpdateDialog(cli, updateManager, snackbar)
    this.i18nDialog = new I18nDialog(cli)
    if (config instanceof ConfigOhMyKeyMint) {
      this.omkDevice = new OmkDeviceDialog(config)
      this.omkRawConfig = new OmkRawConfigDialog(config, snackbar)
      this.omkLogs = new OmkLogsDialog(config, snackbar)
    }
  }

  appendAll(container: HTMLElement): void {
    container.appendChild(this.about.getElement())
    container.appendChild(this.help.getElement())
    container.appendChild(this.uninstall.getElement())
    container.appendChild(this.defaultPolicy.getElement())
    container.appendChild(this.systemApp.getElement())
    container.appendChild(this.prop.getElement())
    container.appendChild(this.update.getElement())
    container.appendChild(this.i18nDialog.getElement())
    this.about.initAnimation()
    this.help.initAnimation()
    this.uninstall.initAnimation()
    this.defaultPolicy.initAnimation()
    this.systemApp.initAnimation()
    this.prop.initAnimation()
    this.update.initAnimation()
    this.i18nDialog.initAnimation()
    if (this.omkDevice) {
      container.appendChild(this.omkDevice.getElement())
      this.omkDevice.initAnimation()
    }
    if (this.omkRawConfig) {
      container.appendChild(this.omkRawConfig.getElement())
      this.omkRawConfig.initAnimation()
    }
    if (this.omkLogs) {
      container.appendChild(this.omkLogs.getElement())
      this.omkLogs.initAnimation()
    }
  }

  get isOmk(): boolean {
    return this.omkDevice !== undefined
  }

  showAbout(): void {
    this.about.show()
  }

  showUpdate(changelog: string): void {
    this.update.show(changelog)
  }

  showHelp(): void {
    this.help.show()
  }

  showUninstall(): void {
    this.uninstall.show()
  }

  showDefaultPolicy(): void {
    this.defaultPolicy.show()
  }

  showSystemApp(): void {
    this.systemApp.show()
  }

  showProp(): void {
    this.prop.show()
  }

  showI18nDialog(): void {
    this.i18nDialog.show()
  }

  showOmkDevice(): void {
    this.omkDevice?.show()
  }

  showOmkRawConfig(): void {
    this.omkRawConfig?.show()
  }

  showOmkLogs(): void {
    this.omkLogs?.show()
  }
}
