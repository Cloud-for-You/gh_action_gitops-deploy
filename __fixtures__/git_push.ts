import { jest } from '@jest/globals'

export const gitPush = jest.fn<typeof import('../src/git_push.js').gitPush>()
