import { runGit } from './git_run.js'

/**
 * Push changes to the cloned GitHub repository.
 *
 * @param path The path directory where repository is located.
 * @param token The GitHub token for authentication (optional).
 * @param message The commit message.
 * @returns Resolves with 'done!' after the push is over.
 */
export async function gitPush(
  path: string,
  repositoryUrl: string,
  token: string,
  message = 'Update deployment file'
): Promise<string> {
  const status = await runGit(path, ['status', '--porcelain'])
  if (status.trim() === '') {
    return 'done!'
  }

  await runGit(path, ['add', '.'])
  await runGit(path, [
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=github-actions[bot]@users.noreply.github.com',
    'commit',
    '-m',
    message
  ])
  if (process.env.DEBUG) {
    await runGit(path, ['config', '--list'])
    await runGit(path, ['status'])
  }
  // Ensure authenticated remote (required for push in GitHub Actions)
  const remoteUrl = `https://x-access-token:${token}@${repositoryUrl.replace(/^https?:\/\//, '')}`
  await runGit(path, ['remote', 'set-url', 'origin', remoteUrl])

  await runGit(path, ['push', 'origin', 'HEAD'])

  return 'done!'
}
