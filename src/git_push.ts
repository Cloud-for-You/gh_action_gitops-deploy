import { runGit } from './git_run.js'

/**
 * Push changes to the cloned GitHub repository.
 *
 * @param path The path directory where repository is located.
 * @param message The commit message.
 * @returns Resolves with 'done!' after the push is over.
 */
export async function gitPush(
  path: string,
  message = 'Update deployment file'
): Promise<string> {
  const status = await runGit(path, ['status', '--porcelain'])
  if (status.trim() === '') {
    return 'done!'
  }

  await runGit(path, ['add', '.'])
  await runGit(path, ['commit', '-m', message])
  await runGit(path, ['push'])

  return 'done!'
}
