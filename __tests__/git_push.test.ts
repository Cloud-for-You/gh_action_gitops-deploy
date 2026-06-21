import { jest } from '@jest/globals'

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}))

const { gitPush } = await import('../src/git_push.js')
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

describe('git_push.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSpawn.mockReturnValue(createChild(0))
  })

  it('does nothing when there are no changes', async () => {
    await expect(gitPush('/tmp/repo')).resolves.toBe('done!')

    expect(mockedSpawn).toHaveBeenCalledTimes(1)
    expect(mockedSpawn).toHaveBeenCalledWith('git', ['status', '--porcelain'], {
      cwd: '/tmp/repo',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  })

  it('adds, commits and pushes when changes exist', async () => {
    mockedSpawn.mockReturnValue(createChild(0, ' M deployment.yaml\n'))

    await expect(gitPush('/tmp/repo', 'Release v1.0.0')).resolves.toBe('done!')

    expect(mockedSpawn).toHaveBeenCalledTimes(4)
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      1,
      'git',
      ['status', '--porcelain'],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(mockedSpawn).toHaveBeenNthCalledWith(2, 'git', ['add', '.'], {
      cwd: '/tmp/repo',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      3,
      'git',
      ['commit', '-m', 'Release v1.0.0'],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(mockedSpawn).toHaveBeenNthCalledWith(4, 'git', ['push'], {
      cwd: '/tmp/repo',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  })

  it('rejects when git exits with a non-zero code', async () => {
    mockedSpawn
      .mockReturnValueOnce(createChild(0, ' M deployment.yaml\n'))
      .mockReturnValueOnce(createChild(0))
      .mockReturnValueOnce(createChild(1, '', 'commit failed'))

    await expect(gitPush('/tmp/repo')).rejects.toThrow(
      'git commit -m Update deployment file exited with code 1: commit failed'
    )
  })

  it('rejects when spawning git fails', async () => {
    mockedSpawn.mockImplementationOnce(() => {
      throw new Error('spawn failed')
    })

    await expect(gitPush('/tmp/repo')).rejects.toThrow('spawn failed')
  })
})
