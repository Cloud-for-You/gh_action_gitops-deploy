import { jest } from '@jest/globals'
import * as yaml from 'js-yaml'

jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}))

const { updateFile } = await import('../src/update_file.js')
const { readFile } = await import('fs/promises')
const mockedReadFile = jest.mocked(readFile)
const { writeFile } = await import('fs/promises')
const mockedWriteFile = jest.mocked(writeFile)

describe('update_file.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedReadFile.mockResolvedValue('apps:\n  - name: app1\n    replicas: 1\n')
    mockedWriteFile.mockResolvedValue(undefined)
  })

  it('updates an existing value at a dot-notation path', async () => {
    await expect(
      updateFile('deployment.yaml', '$.apps[0].name', 'app2')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.apps[0].name).toBe('app2')
  })

  it('updates an existing value at a bracket-notation path', async () => {
    await expect(
      updateFile('deployment.yaml', "$['apps'][0]['name']", 'app2')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.apps[0].name).toBe('app2')
  })

  it('inserts a new value when the path does not exist', async () => {
    await expect(
      updateFile('deployment.yaml', '$.new.prop', 'value')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.new.prop).toBe('value')
  })

  it('inserts a new array element when the index does not exist', async () => {
    await expect(
      updateFile('deployment.yaml', '$.apps[1].name', 'app2')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.apps[1].name).toBe('app2')
  })

  it('throws when file is not found', async () => {
    mockedReadFile.mockRejectedValueOnce(new Error('ENOENT'))

    await expect(updateFile('missing.yaml', '$.key', 'value')).rejects.toThrow(
      'File not found: missing.yaml'
    )
  })

  it('throws when file is not valid YAML', async () => {
    mockedReadFile.mockResolvedValueOnce('{{invalid: yaml: [')

    await expect(updateFile('invalid.yaml', '$.key', 'value')).rejects.toThrow(
      'Invalid YAML file: invalid.yaml'
    )
  })

  it('throws when YAML is not an object', async () => {
    mockedReadFile.mockResolvedValueOnce('just-a-string')

    await expect(updateFile('scalar.yaml', '$.key', 'value')).rejects.toThrow(
      'YAML must contain an object'
    )
  })
})
