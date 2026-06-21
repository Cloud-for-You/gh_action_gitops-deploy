import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'

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
  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch (e) {
    throw new Error(`File not found: ${filePath}`, { cause: e })
  }

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

  const tokens = parseJsonPath(jsonpath)
  if (tokens.length === 0) {
    throw new Error(`Invalid JSONPath: ${jsonpath}`)
  }

  let current: unknown = obj
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]
    if (typeof token === 'number') {
      const arr = current as unknown[]
      if (!Array.isArray(arr)) {
        throw new Error(`Expected array at path segment ${token}`)
      }
      if (arr[token] === undefined || arr[token] === null) {
        const next = tokens[i + 1]
        arr[token] = typeof next === 'number' ? [] : {}
      }
      current = arr[token]
    } else {
      const map = current as Record<string, unknown>
      if (typeof map !== 'object' || map === null || Array.isArray(map)) {
        throw new Error(`Expected object at property ${token}`)
      }
      if (map[token] === undefined || map[token] === null) {
        const next = tokens[i + 1]
        map[token] = typeof next === 'number' ? [] : {}
      }
      current = map[token]
    }
  }

  const last = tokens[tokens.length - 1]
  if (typeof last === 'number') {
    const arr = current as unknown[]
    if (!Array.isArray(arr) || last >= arr.length) {
      throw new Error(`JSONPath index out of bounds: ${jsonpath}`)
    }
    arr[last] = value
  } else {
    ;(current as Record<string, unknown>)[last] = value
  }

  await fs.writeFile(filePath, yaml.dump(obj), 'utf-8')

  return 'done!'
}

function parseJsonPath(path: string): (string | number)[] {
  if (!path.startsWith('$')) {
    throw new Error(`Invalid JSONPath: ${path}`)
  }

  const tokens: (string | number)[] = []
  let remaining = path.slice(1)

  while (remaining.length > 0) {
    if (remaining.startsWith('.')) {
      remaining = remaining.slice(1)
      const dotMatch = remaining.match(/^([a-zA-Z_$][\w-]*)/)
      if (dotMatch) {
        tokens.push(dotMatch[1])
        remaining = remaining.slice(dotMatch[1].length)
      } else {
        throw new Error(`Invalid JSONPath: ${path}`)
      }
    } else if (remaining.startsWith('[')) {
      remaining = remaining.slice(1)
      if (remaining.startsWith("'") || remaining.startsWith('"')) {
        const quote = remaining[0]
        remaining = remaining.slice(1)
        const end = remaining.indexOf(quote)
        if (end === -1) {
          throw new Error(`Invalid JSONPath: ${path}`)
        }
        tokens.push(remaining.slice(0, end))
        remaining = remaining.slice(end + 1)
        if (!remaining.startsWith(']')) {
          throw new Error(`Invalid JSONPath: ${path}`)
        }
        remaining = remaining.slice(1)
      } else {
        const numMatch = remaining.match(/^(\d+)/)
        if (!numMatch) {
          throw new Error(`Invalid JSONPath: ${path}`)
        }
        tokens.push(parseInt(numMatch[1]))
        remaining = remaining.slice(numMatch[1].length)
        if (!remaining.startsWith(']')) {
          throw new Error(`Invalid JSONPath: ${path}`)
        }
        remaining = remaining.slice(1)
      }
    } else {
      throw new Error(`Invalid JSONPath: ${path}`)
    }
  }

  return tokens
}
