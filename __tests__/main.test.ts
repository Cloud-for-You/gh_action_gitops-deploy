/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import { gitClone } from '../__fixtures__/git_clone.js'
import { gitPush } from '../__fixtures__/git_push.js'
import { updateFile } from '../__fixtures__/update_file.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/git_clone.js', () => ({ gitClone: gitClone }))
jest.unstable_mockModule('../src/git_push.js', () => ({ gitPush: gitPush }))
jest.unstable_mockModule('../src/update_file.js', () => ({
  updateFile: updateFile
}))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation(() => '500')

    // Mock the gitClone, gitPush and updateFile functions so they do not actually execute.
    gitClone.mockImplementation(() => Promise.resolve('done!'))
    gitPush.mockImplementation(() => Promise.resolve('done!'))
    updateFile.mockImplementation(() => Promise.resolve('done!'))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Sets the time output', async () => {
    await run()

    // Verify the time output was set.
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      // Simple regex to match a time string in the format HH:MM:SS.
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
  })

  it('pushes changes when push is enabled', async () => {
    core.getInput
      .mockReset()
      .mockReturnValueOnce('owner/ops')
      .mockReturnValueOnce('main')
      .mockReturnValueOnce('/tmp/ops')
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('deployment.yaml')
      .mockReturnValueOnce('$.image.tag')
      .mockReturnValueOnce('v1.2.3')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false')

    await run()

    expect(gitPush).toHaveBeenCalledWith('/tmp/ops', 'Update deployment.yaml')
  })

  it('Sets a failed status', async () => {
    // Clear the getInput mock and return an invalid value.
    core.getInput.mockClear().mockReturnValueOnce('this is not a number')

    // Clear the updateFile mock and return a rejected promise.
    updateFile
      .mockClear()
      .mockRejectedValueOnce(new Error('milliseconds is not a number'))

    await run()

    // Verify that the action was marked as failed.
    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'milliseconds is not a number'
    )
  })
})
