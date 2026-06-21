import { jest } from '@jest/globals'

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}))

const { gitClone } = await import('../src/git_clone.js')
const { spawn } = await import('child_process')

const mockedSpawn = jest.mocked(spawn)
type ChildProcess = ReturnType<typeof spawn>

const createChild = (
  code: number | null,
  stdout = '',
  stderr = ''
): ChildProcess => {
  const stdoutEmitter = {
    on: jest.fn(
      (_event: string, callback: (chunk: Buffer | string) => void) => {
        if (_event === 'data') {
          callback(stdout)
        }
      }
    )
  }
  const stderrEmitter = {
    on: jest.fn(
      (_event: string, callback: (chunk: Buffer | string) => void) => {
        if (_event === 'data') {
          callback(stderr)
        }
      }
    )
  }
  const child = {
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
    on: jest.fn((_event: string, callback: (code?: number | null) => void) => {
      if (_event === 'close') {
        callback(code)
      }
    })
  } as unknown as ChildProcess

  return child
}

describe('git_clone.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSpawn.mockReturnValue(createChild(0))
  })

  it('clones a repository to the destination', async () => {
    await expect(
      gitClone(
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo',
        undefined,
        undefined as unknown as string
      )
    ).resolves.toBe('done!')

    expect(mockedSpawn).toHaveBeenCalledWith(
      'git',
      ['clone', 'https://github.com/octocat/hello-world.git', '/tmp/repo'],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  })

  it('clones a specific branch when provided', async () => {
    await gitClone(
      'https://github.com/octocat/hello-world.git',
      '/tmp/repo',
      'main',
      undefined as unknown as string
    )

    expect(mockedSpawn).toHaveBeenCalledWith(
      'git',
      [
        'clone',
        '-b',
        'main',
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo'
      ],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  })

  it('uses token authentication in the clone URL', async () => {
    await gitClone(
      'https://github.com/octocat/hello-world.git',
      '/tmp/repo',
      undefined,
      'ghp_token'
    )

    expect(mockedSpawn).toHaveBeenCalledWith(
      'git',
      [
        'clone',
        'https://x-access-token:ghp_token@github.com/octocat/hello-world.git',
        '/tmp/repo'
      ],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  })

  it('rejects when git exits with a non-zero code', async () => {
    mockedSpawn.mockReturnValueOnce(createChild(128))

    await expect(
      gitClone(
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo',
        undefined,
        undefined as unknown as string
      )
    ).rejects.toThrow(
      'git clone https://github.com/octocat/hello-world.git /tmp/repo exited with code 128'
    )
  })

  it('rejects when spawning git fails', async () => {
    mockedSpawn.mockImplementationOnce(() => {
      throw new Error('spawn failed')
    })

    await expect(
      gitClone(
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo',
        undefined,
        undefined as unknown as string
      )
    ).rejects.toThrow('spawn failed')
  })
})
