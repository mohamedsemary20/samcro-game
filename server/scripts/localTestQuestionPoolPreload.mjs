import os from 'node:os'

const systemUserInfo = os.userInfo.bind(os)
os.userInfo = (...args) => {
  try { return systemUserInfo(...args) }
  catch (error) {
    const detail = error && typeof error === 'object' ? error : null
    const code = detail && 'code' in detail ? detail.code
      : detail && 'info' in detail && detail.info && typeof detail.info === 'object' && 'code' in detail.info ? detail.info.code
        : undefined
    const infoCode = detail && 'info' in detail && detail.info && typeof detail.info === 'object' && 'code' in detail.info ? detail.info.code : undefined
    if (code !== 'ENOMEM' && infoCode !== 'ENOMEM') throw error
    return { username: 'samkaro-local-test', uid: -1, gid: -1, homedir: process.cwd(), shell: '' }
  }
}
