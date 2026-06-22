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

  it('throws when JSONPath is invalid (no tokens)', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', '$', 'value')).rejects.toThrow(
      'Invalid JSONPath: $'
    )
  })

  it('throws when expected array at path segment but got object', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', '$.apps.foo.bar', 'value')
    ).rejects.toThrow('Expected object at property foo')
  })

  it('throws when expected object at property but got array', async () => {
    mockedReadFile.mockResolvedValueOnce('items: hello\n')

    // items is string 'hello', then [0] tries to access index on string (not array)
    await expect(
      updateFile('test.yaml', '$.items[0].bar', 'value')
    ).rejects.toThrow('Expected array at path segment 0')
  })

  it('throws when JSONPath index out of bounds', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', '$.apps[2]', 'value')).rejects.toThrow(
      'JSONPath index out of bounds: $.apps[2]'
    )
  })

  it('throws when JSONPath does not start with $', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', 'apps[0].name', 'value')
    ).rejects.toThrow('Invalid JSONPath: apps[0].name')
  })

  it('throws when JSONPath has invalid character after dot', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', '$.123invalid', 'value')
    ).rejects.toThrow('Invalid JSONPath: $.123invalid')
  })

  it('throws when JSONPath has unclosed quoted bracket', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', "$['foo", 'value')).rejects.toThrow(
      "Invalid JSONPath: $['foo"
    )
  })

  it('throws when JSONPath has unclosed bracket', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', '$.apps[', 'value')).rejects.toThrow(
      'Invalid JSONPath: $.apps['
    )
  })

  it('throws when JSONPath has non-numeric array index', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', '$.apps[abc]', 'value')
    ).rejects.toThrow('Invalid JSONPath: $.apps[abc]')
  })

  it('throws when JSONPath has missing closing bracket', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(
      updateFile('test.yaml', '$.apps[0x]', 'value')
    ).rejects.toThrow('Invalid JSONPath: $.apps[0x]')
  })

  it('updates value at existing array index', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    // apps[0] exists, so this should update it
    await expect(
      updateFile('test.yaml', '$.apps[0].name', 'app2')
    ).resolves.toBe('done!')

    const [, content] = mockedWriteFile.mock.calls[0]
    const obj = yaml.load(content as string) as Record<string, unknown>
    expect(obj.apps[0].name).toBe('app2')
  })

  it('throws when quoted bracket has missing closing quote', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', "$['foo'x]", 'value')).rejects.toThrow(
      "Invalid JSONPath: $['foo'x]"
    )
  })

  it('updates array element by numeric index', async () => {
    mockedReadFile.mockResolvedValueOnce(
      'apps:\n  - name: app1\n    replicas: 1\n'
    )

    await expect(updateFile('test.yaml', '$.apps[0]', 'updated')).resolves.toBe(
      'done!'
    )
  })

  it('throws when JSONPath has trailing dot', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    await expect(updateFile('test.yaml', '$.apps.', 'value')).rejects.toThrow(
      'Invalid JSONPath: $.apps.'
    )
  })

  it('throws when JSONPath has invalid character after $', async () => {
    mockedReadFile.mockResolvedValueOnce('apps:\n  - name: app1\n')

    // Use a path where after $ there's an invalid character that's not . or [
    await expect(updateFile('test.yaml', '$x', 'value')).rejects.toThrow(
      'Invalid JSONPath: $x'
    )
  })
})
