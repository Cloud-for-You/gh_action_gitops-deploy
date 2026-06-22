import { runGit } from './git_run.js'

/**
 * Create a Pull Request in GitHub repository using the GitHub API.
 *
 * @param path The path directory for the cloned repository.
 * @param repository The repository in owner/repo format.
 * @param ref The target branch in the repository.
 * @param token The GitHub token for authentication.
 * @param githubEnterpriseUrl The GitHub Enterprise URL (optional).
 * @param deploymentFile The deployment file being updated.
 * @param value The new value being set.
 * @param jsonpath The JSON path that was updated.
 * @returns Resolves with status string after creating the pull request.
 */
export async function gitCreatePr(
  path: string,
  repository: string,
  ref: string,
  token: string,
  githubEnterpriseUrl: string | undefined,
  deploymentFile: string,
  value: string,
  jsonpath: string
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
    `Update ${deploymentFile}`
  ])
  if (process.env.DEBUG) {
    await runGit(path, ['config', '--list'])
    await runGit(path, ['status'])
  }

  const branchName = `release/${value}`

  const repositoryUrl = githubEnterpriseUrl
    ? `${githubEnterpriseUrl}/${repository}.git`
    : `https://github.com/${repository}.git`
  const remoteUrl = `https://x-access-token:${token}@${repositoryUrl.replace(/^https?:\/\//, '')}`
  await runGit(path, ['remote', 'set-url', 'origin', remoteUrl])

  await runGit(path, ['checkout', '-b', branchName])
  await runGit(path, ['push', 'origin', branchName])

  const apiBase = githubEnterpriseUrl
    ? `${githubEnterpriseUrl.replace(/^https?:\/\//, '')}/api/v3`
    : 'https://api.github.com'
  const response = await fetch(`${apiBase}/repos/${repository}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      title: `Update ${deploymentFile}`,
      head: branchName,
      base: ref,
      body: `Updated ${deploymentFile} at JSONPath \`${jsonpath}\` with value \`${value}\`.`
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create PR: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  const data = (await response.json()) as { number: number }
  return `done! PR #${data.number} created`
}
