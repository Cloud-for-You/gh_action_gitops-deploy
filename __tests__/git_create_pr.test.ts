import { jest } from '@jest/globals'

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}))

const { gitCreatePr } = await import('../src/git_create_pr.js')
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

const mockFetch = (data: unknown, ok = true) =>
  jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 201 : 400,
      statusText: ok ? 'Created' : 'Bad Request',
      json: () => Promise.resolve(data),
      text: () => Promise.resolve('')
    } as unknown as Response)
  )

describe('git_create_pr.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DEBUG
    mockedSpawn.mockReturnValue(createChild(0))
    ;(global as unknown as { fetch: jest.Mock }).fetch = mockFetch({
      number: 42
    })
  })

  it('does nothing when there are no changes', async () => {
    await expect(
      gitCreatePr(
        '/tmp/repo',
        'owner/repo',
        'main',
        'token',
        undefined,
        'deployment.yaml',
        'v1.2.3',
        '$.version'
      )
    ).resolves.toBe('done!')

    expect(mockedSpawn).toHaveBeenCalledTimes(1)
    expect(mockedSpawn).toHaveBeenCalledWith('git', ['status', '--porcelain'], {
      cwd: '/tmp/repo',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  })

  it('adds, commits, creates branch, pushes and creates PR when changes exist', async () => {
    mockedSpawn.mockReturnValue(createChild(0, ' M deployment.yaml\n'))

    await expect(
      gitCreatePr(
        '/tmp/repo',
        'owner/repo',
        'main',
        'token',
        undefined,
        'deployment.yaml',
        'v1.2.3',
        '$.version'
      )
    ).resolves.toBe('done! PR #42 created')

    expect(mockedSpawn).toHaveBeenCalledTimes(6)
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
      [
        '-c',
        'user.name=github-actions[bot]',
        '-c',
        'user.email=github-actions[bot]@users.noreply.github.com',
        'commit',
        '-m',
        'Update deployment.yaml'
      ],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      4,
      'git',
      [
        'remote',
        'set-url',
        'origin',
        'https://x-access-token:token@github.com/owner/repo.git'
      ],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      5,
      'git',
      ['checkout', '-b', 'release/main'],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      6,
      'git',
      ['push', 'origin', 'release/main'],
      {
        cwd: '/tmp/repo',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/pulls',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token'
        })
      })
    )
  })

  it('rejects when PR creation fails', async () => {
    mockedSpawn.mockReturnValue(createChild(0, ' M deployment.yaml\n'))
    ;(global as unknown as { fetch: jest.Mock }).fetch = mockFetch(
      { message: 'Bad credentials' },
      false
    )

    await expect(
      gitCreatePr(
        '/tmp/repo',
        'owner/repo',
        'main',
        'token',
        undefined,
        'deployment.yaml',
        'v1.2.3',
        '$.version'
      )
    ).rejects.toThrow('Failed to create PR')
  })
})
