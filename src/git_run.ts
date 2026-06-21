import { spawn } from 'child_process'

export async function runGit(path: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: path,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        const details = stderr.trim() ? `: ${stderr.trim()}` : ''
        reject(
          new Error(`git ${args.join(' ')} exited with code ${code}${details}`)
        )
      }
    })
    child.on('error', reject)
  })
}
