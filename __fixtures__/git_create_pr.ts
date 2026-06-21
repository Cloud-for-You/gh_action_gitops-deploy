import { jest } from '@jest/globals'

export const gitCreatePr =
  jest.fn<typeof import('../src/git_create_pr.js').gitCreatePr>()
