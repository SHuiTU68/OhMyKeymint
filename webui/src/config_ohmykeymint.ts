import { File } from './file'
import { Config, PolicySchema } from './config'
import type { ConfigData } from './config'
import { parse, stringify } from 'smol-toml'

function prettyPrintToml(toml: string): string {
  const scoopMatch = toml.match(/^scoop = \[(.*)\]$/m)
  if (!scoopMatch) return toml

  const items = scoopMatch[1]
    .split(',')
    .map((v: string) => v.trim())
    .filter((v: string) => v.length > 0)

  if (items.length <= 2) return toml

  return toml.replace(
    /^scoop = \[.*\]$/m,
    `scoop = [\n${items.map((item: string) => `  ${item}`).join(',\n')},\n]`
  )
}

const OMK_POLICY_SCHEMA = new PolicySchema({
  os_version: {
    label: 'OS Version',
    defaultValue: 'auto',
    options: ['auto'],
    placeholder: '15',
    validate: (v) => !v || v === 'auto' || /^\d+$/.test(v) || 'auto | number',
  },
  security_patch: {
    label: 'Security Patch',
    defaultValue: 'auto',
    options: ['auto', 'latest'],
    maxlength: 10,
    placeholder: 'YYYY-MM-DD',
    validate: (v) => !v || ['auto', 'latest'].includes(v) || /^\d{4}-\d{2}-\d{2}$/.test(v) || 'auto | latest | YYYY-MM-DD',
  },
  vb_key: {
    label: 'VB Key',
    defaultValue: 'auto',
    options: ['auto', 'random'],
    maxlength: 64,
    placeholder: '64 hex chars',
    textarea: true,
    validate: (v) => !v || ['auto', 'random'].includes(v) || /^[0-9a-f]{64}$/i.test(v) || 'auto | random | 64 hex chars',
  },
  vb_hash: {
    label: 'VB Hash',
    defaultValue: 'auto',
    options: ['auto', 'random'],
    maxlength: 64,
    placeholder: '64 hex chars',
    textarea: true,
    validate: (v) => !v || ['auto', 'random'].includes(v) || /^[0-9a-f]{64}$/i.test(v) || 'auto | random | 64 hex chars',
  },
})

// Device identity fields. Telephony fields (imei/imei2/meid) are optional and
// may legitimately be empty on single-IMEI or non-telephony devices.
const OMK_DEVICE_SCHEMA = new PolicySchema({
  brand: {
    label: 'Brand',
    placeholder: 'Google',
    validate: () => true,
  },
  device: {
    label: 'Device',
    placeholder: 'generic',
    validate: () => true,
  },
  product: {
    label: 'Product',
    placeholder: 'generic',
    validate: () => true,
  },
  manufacturer: {
    label: 'Manufacturer',
    placeholder: 'Google',
    validate: () => true,
  },
  model: {
    label: 'Model',
    placeholder: 'generic',
    validate: () => true,
  },
  serial: {
    label: 'Serial',
    placeholder: 'ABC12345678ABC',
    validate: () => true,
  },
  imei: {
    label: 'IMEI',
    placeholder: '(optional)',
    validate: () => true,
  },
  imei2: {
    label: 'IMEI2',
    placeholder: '(optional)',
    validate: () => true,
  },
  meid: {
    label: 'MEID',
    placeholder: '(optional)',
    validate: () => true,
  },
  overrideTelephonyProperties: {
    type: 'boolean',
    label: 'Override Telephony Properties',
  },
})

export class ConfigOhMyKeyMint extends Config {
  override readonly identity: string = 'OMK'

  protected override readonly CONFIG_PATH = '/data/misc/keystore/omk'
  protected override readonly CONFIG_FILE = this.CONFIG_PATH + '/config.toml'
  protected readonly INJECTOR_FILE = this.CONFIG_PATH + '/injector.toml'
  protected readonly LOG_DIR = this.CONFIG_PATH + '/logs'
  protected readonly STATE_DIR = '/data/adb/omk'

  protected readonly perAppConfig: boolean = false
  protected readonly appMode: boolean = false

  override readonly policySchema = OMK_POLICY_SCHEMA
  readonly deviceSchema = OMK_DEVICE_SCHEMA

  #injector: Record<string, unknown> | null = null
  #omkConfig: Record<string, unknown> | null = null

  override async read(): Promise<void> {
    if (import.meta.env.DEV) {
      this.set({
        default_policy: {
          os_version: '15',
          security_patch: 'auto',
          vb_key: 'auto',
          vb_hash: 'auto',
        },
        target: [
          'io.github.vvb2060.keyattestation',
          'com.google.android.gms',
        ],
      })
      return
    }

    const data: ConfigData = {}

    try {
      const raw = await File.read(this.INJECTOR_FILE)
      this.#injector = parse(raw) as Record<string, unknown>
      data.target = (this.#injector.scoop as string[]) ?? []
    } catch {
      this.#injector = null
      data.target = []
    }

    try {
      const raw = await File.read(this.CONFIG_FILE)
      this.#omkConfig = parse(raw) as Record<string, unknown>
      const trust = this.#omkConfig.trust as Record<string, unknown> | undefined
      if (trust) {
        const policy: Record<string, string> = {}
        for (const key of ['os_version', 'security_patch', 'vb_key', 'vb_hash']) {
          if (trust[key] !== undefined) {
            policy[key] = String(trust[key])
          }
        }
        if (Object.keys(policy).length > 0) {
          data.default_policy = policy
        }
      }
      const device = this.#omkConfig.device as Record<string, unknown> | undefined
      if (device) {
        const devPolicy: Record<string, string | boolean> = {}
        for (const key of ['brand', 'device', 'product', 'manufacturer', 'model', 'serial', 'imei', 'imei2', 'meid', 'overrideTelephonyProperties']) {
          if (device[key] !== undefined) {
            const val = device[key]
            devPolicy[key] = typeof val === 'boolean' ? val : String(val)
          }
        }
        if (Object.keys(devPolicy).length > 0) {
          data.device = devPolicy
        }
      }
    } catch {
      this.#omkConfig = null
    }

    if (!data.default_policy) {
      data.default_policy = { os_version: 'auto', security_patch: 'auto', vb_key: 'auto', vb_hash: 'auto' }
    }

    this.set(data)
  }

  override async write(): Promise<void> {
    const data = this.get()

    const injector = this.#injector ?? {}
    injector.scoop = data.target ?? []
    this.#injector = injector
    await File.write(this.INJECTOR_FILE, prettyPrintToml(stringify(this.#injector)))

    const omkConfig = this.#omkConfig ?? {}
    const trust = (omkConfig.trust ?? {}) as Record<string, unknown>
    const policy = data.default_policy ?? {}

    if (policy.security_patch !== undefined) trust.security_patch = policy.security_patch
    if (policy.vb_key !== undefined) trust.vb_key = policy.vb_key
    if (policy.vb_hash !== undefined) trust.vb_hash = policy.vb_hash
    if (policy.os_version !== undefined) {
      const osVer = policy.os_version as string
      trust.os_version = /^\d+$/.test(osVer)
        ? parseInt(osVer, 10)
        : osVer
    }

    omkConfig.trust = trust

    const device = (omkConfig.device ?? {}) as Record<string, unknown>
    const devPolicy = (data.device ?? {}) as Record<string, string | boolean>
    for (const key of ['brand', 'device', 'product', 'manufacturer', 'model', 'serial', 'imei', 'imei2', 'meid']) {
      if (devPolicy[key] !== undefined && devPolicy[key] !== '') {
        device[key] = devPolicy[key]
      }
    }
    if (devPolicy.overrideTelephonyProperties !== undefined) {
      device.overrideTelephonyProperties = devPolicy.overrideTelephonyProperties
    }
    omkConfig.device = device

    this.#omkConfig = omkConfig
    await File.write(this.CONFIG_FILE, stringify(this.#omkConfig))
  }

  get logDir(): string {
    return this.LOG_DIR
  }

  get stateDir(): string {
    return this.STATE_DIR
  }

  // Raw accessors for the advanced editor. They re-parse the in-memory state so
  // subsequent structured edits stay consistent with the raw text.
  async getRawConfig(): Promise<string> {
    try {
      return await File.read(this.CONFIG_FILE)
    } catch {
      return ''
    }
  }

  async setRawConfig(raw: string): Promise<void> {
    await File.write(this.CONFIG_FILE, raw)
    try {
      this.#omkConfig = parse(raw) as Record<string, unknown>
    } catch {
      // keep previous in-memory state if the user wrote something unparseable
    }
  }

  async getRawInjector(): Promise<string> {
    try {
      return await File.read(this.INJECTOR_FILE)
    } catch {
      return ''
    }
  }

  async setRawInjector(raw: string): Promise<void> {
    await File.write(this.INJECTOR_FILE, raw)
    try {
      this.#injector = parse(raw) as Record<string, unknown>
    } catch {
      // keep previous in-memory state
    }
  }
}
