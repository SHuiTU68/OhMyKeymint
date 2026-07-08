import { exec } from 'kernelsu-alt'

export class File {
  static async exist(path: string): Promise<boolean> {
    const { errno } = await exec(`[ -e "${path}" ]`)
    return errno === 0
  }

  static async isDirectory(path: string): Promise<boolean> {
    const { errno } = await exec(`[ -d "${path}" ]`)
    return errno === 0
  }

  static async read(path: string): Promise<string> {
    const result = await exec(`cat "${path}"`)
    if (result.errno !== 0) throw new Error(`File.read failed (${result.errno}): ${result.stderr}`)
    return result.stdout
  }

  static async write(path: string, data: string, cmd: string = 'cat'): Promise<void> {
    const result = await exec(`(${cmd}) << 'FileEOF' > "${path}"
${data.trim()}
FileEOF`)
    if (result.errno !== 0) throw new Error(`File.write failed (${result.errno}): ${result.stderr}`)
  }

  static async move(src: string, dst: string): Promise<void> {
    const result = await exec(`mv -f "${src}" "${dst}"`)
    if (result.errno !== 0) throw new Error(`File.move failed (${result.errno}): ${result.stderr}`)
  }

  static async copy(src: string, dst: string): Promise<void> {
    const result = await exec(`cp -rf "${src}" "${dst}"`)
    if (result.errno !== 0) throw new Error(`File.copy failed (${result.errno}): ${result.stderr}`)
  }

  static async delete(path: string): Promise<void> {
    const result = await exec(`rm -rf "${path}"`)
    if (result.errno !== 0) throw new Error(`File.delete failed (${result.errno}): ${result.stderr}`)
  }

  static async createFile(path: string): Promise<void> {
    const result = await exec(`touch "${path}"`)
    if (result.errno !== 0) throw new Error(`File.createFile failed (${result.errno}): ${result.stderr}`)
  }

  static async createDirectory(dir: string): Promise<void> {
    const result = await exec(`mkdir -p "${dir}"`)
    if (result.errno !== 0) throw new Error(`File.createDirectory failed (${result.errno}): ${result.stderr}`)
  }

  // Set owner/group/mode on a path. Used after writing OMK runtime files so
  // the keystore-uid daemon (1017) can read them and so config seeds are not
  // world-readable. Best-effort: failures are swallowed because a root
  // WebUI write already leaves the file readable to root, and the daemon
  // re-fixes ownership on its next startup.
  static async setOwnership(path: string, mode: string, uid: number, gid: number): Promise<void> {
    await exec(`chown ${uid}:${gid} "${path}" 2>/dev/null; chmod ${mode} "${path}" 2>/dev/null`).catch(() => {})
  }
}
