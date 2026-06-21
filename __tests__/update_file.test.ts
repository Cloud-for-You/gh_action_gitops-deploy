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

  it('updates multiple matching values', async () => {
    // JSONPath can match multiple values if the path is not specific enough
    await expect(
      updateFile('deployment.yaml', '$.apps[*].replicas', '3')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.apps[0].replicas).toBe('3')
  })

  it('throws when JSONPath not found', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', '$.apps[10]', 'value')
    ).rejects.toThrow('JSONPath not found: $.apps[10]')
  })

  it('throws when trying to set on root path', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    // $ refers to root, which has null parent
    await expect(updateFile('test.yaml', '$', 'value')).rejects.toThrow(
      'Cannot set value at path: $'
    )
  })
})
