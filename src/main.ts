import * as core from '@actions/core'
import { gitClone } from './git_clone.js'
import { gitPush } from './git_push.js'
import { gitCreatePr } from './git_create_pr.js'
import { updateFile } from './update_file.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const repository: string = core.getInput('repository')
    const ref: string = core.getInput('ref')
    const path: string = core.getInput('path')
    const token: string = core.getInput('token')
    const deploymentFile: string = core.getInput('deployment_file')
    const jsonpath: string = core.getInput('jsonpath')
    const value: string = core.getInput('value')
    const githubEnterpriseUrl: string = core.getInput('github_enterprise_url')
    //const push: boolean = core.getBooleanInput('push')
    //const pullRequest: boolean = core.getBooleanInput('pull_request')

    let repositoryUrl: string
    if (githubEnterpriseUrl) {
      core.debug(`Using GitHub Enterprise URL: ${githubEnterpriseUrl}`)
      repositoryUrl = `${githubEnterpriseUrl}/${repository}.git`
    } else {
      repositoryUrl = `https://github.com/${repository}.git`
    }

    // Clone ops repository to a temporary directory.
    core.info(`Cloning repository ${repositoryUrl} to ./${path} at ref ${ref}`)
    await gitClone(repositoryUrl, path, ref, token)

    // Update the deployment file with the new value using the provided JSONPath.
    core.info(
      `Updating deployment file ${deploymentFile} at JSONPath ${jsonpath} with value ${value}`
    )
    await updateFile(path + '/' + deploymentFile, jsonpath, value)

    // Direct push or create Pull Request
    if (core.getInput('push') === 'true') {
      core.info('Direct push is enabled.')
      await gitPush(path, repositoryUrl, `Update ${deploymentFile}`, token)
    } else if (core.getInput('pull_request') === 'true') {
      core.info('Pull request creation is enabled.')
      await gitCreatePr(
        path,
        repository,
        ref,
        token,
        githubEnterpriseUrl || undefined,
        deploymentFile,
        value,
        jsonpath
      )
    } else {
      core.debug('Neither direct push nor pull request creation is enabled.')
    }

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
