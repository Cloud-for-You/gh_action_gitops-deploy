import { jest } from '@jest/globals'

export const gitClone = jest.fn<typeof import('../src/git_clone.js').gitClone>()
