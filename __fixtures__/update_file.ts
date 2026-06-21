import { jest } from '@jest/globals'

export const updateFile =
  jest.fn<typeof import('../src/update_file.js').updateFile>()
