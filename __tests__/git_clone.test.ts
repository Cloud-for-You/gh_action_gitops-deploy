import { jest } from '@jest/globals'

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn()
}))

const { gitClone } = await import('../src/git_clone.js')
const { spawn } = await import('child_process')

const mockedSpawn = jest.mocked(spawn)

const createChild = (code: number | null): ReturnType<typeof spawn> =>
  ({
    on: jest.fn((_event: string, callback: (code?: number | null) => void) => {
      if (_event === 'close') {
        callback(code)
      }
      return child
    })
  }) as unknown as ReturnType<typeof spawn>

describe('git_clone.ts', () => {
  const child = createChild(0)

  beforeEach(() => {
    jest.clearAllMocks()
    mockedSpawn.mockReturnValue(child)
  })

  it('clones a repository to the destination', async () => {
    await expect(
      gitClone(
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo',
        undefined,
        undefined
      )
    ).resolves.toBe('done!')

    expect(mockedSpawn).toHaveBeenCalledWith(
      'git',
      ['clone', 'https://github.com/octocat/hello-world.git', '/tmp/repo'],
      { stdio: 'inherit' }
    )
  })

  it('clones a specific branch when provided', async () => {
    await gitClone(
      'https://github.com/octocat/hello-world.git',
      '/tmp/repo',
      'main',
      undefined
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
      { stdio: 'inherit' }
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
        'https://ghp_token@github.com/octocat/hello-world.git',
        '/tmp/repo'
      ],
      { stdio: 'inherit' }
    )
  })

  it('rejects when git exits with a non-zero code', async () => {
    mockedSpawn.mockReturnValueOnce(createChild(128))

    await expect(
      gitClone(
        'https://github.com/octocat/hello-world.git',
        '/tmp/repo',
        undefined,
        undefined
      )
    ).rejects.toThrow('git exited with code 128')
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
        undefined
      )
    ).rejects.toThrow('spawn failed')
  })
})
