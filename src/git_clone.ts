import { runGit } from './git_run.js'

/**
 * Clone GitHub repository
 *
 * @param repositoryUrl The URL of the repository to clone.
 * @param path The path directory for the cloned repository.
 * @param branch The branch to clone (optional).
 * @param token The GitHub token for authentication (optional).
 * @returns Resolves with 'done!' after the cloning is over.
 */
export async function gitClone(
  repositoryUrl: string,
  path: string,
  branch: string | undefined,
  token: string | undefined
): Promise<string> {
  const cloneUrl = token
    ? repositoryUrl.replace(/^https?:\/\//, `https://${token}@`)
    : repositoryUrl

  const args: string[] = ['clone']
  if (branch) {
    args.push('-b', branch)
  }
  args.push(cloneUrl, path)

  await runGit(process.cwd(), args)

  return 'done!'
}
