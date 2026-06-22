import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'
import { JSONPath } from 'jsonpath-plus'

/**
 * Update a file with new values
 *
 * @param filePath The path to the file to update.
 * @param jsonpath The JSONPath expression for the value to update.
 * @param value The new value for the specified path.
 * @returns Resolves with 'done!' after the update is complete.
 */
export async function updateFile(
  filePath: string,
  jsonpath: string,
  value: string
): Promise<string> {
  // 1. načtení souboru
  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch (e) {
    throw new Error(`File not found: ${filePath}`, { cause: e })
  }

  // 2. parse YAML
  let obj: unknown
  try {
    obj = yaml.load(content)
  } catch (e) {
    throw new Error(`Invalid YAML file: ${filePath}`, { cause: e })
  }

  if (obj === null || typeof obj !== 'object') {
    throw new Error(
      `YAML must contain an object, got ${typeof obj}: ${filePath}`
    )
  }

  // 3. najdi parent objekty + key
  const results = JSONPath({
    path: jsonpath,
    json: obj,
    resultType: 'all',
    eval: false
  })

  if (!results || results.length === 0) {
    throw new Error(`JSONPath not found: ${jsonpath}`)
  }

  // 4. update hodnot
  for (const r of results) {
    const parent = r.parent as Record<string, unknown> | null
    const key = r.parentProperty as string | undefined

    if (parent === null || key === undefined) {
      throw new Error(`Cannot set value at path: ${jsonpath}`)
    }

    parent[key] = value
  }

  // 5. zapiš zpět
  await fs.writeFile(filePath, yaml.dump(obj), 'utf-8')

  return 'done!'
}
