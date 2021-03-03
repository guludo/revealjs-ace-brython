class CodeTree {
  constructor(nodes) {
    this.nodeMap = new Map()
    this.nodes = new Array(nodes.length)

    // Construct idToNode and look for repeated ids
    const nodesWithId = nodes.filter(node => node.id)
    const idToNode = new Map()
    nodesWithId.forEach((n, i) => {
      if (idToNode.has(n.id)) {
        throw new Error(`duplicate id "${n.id}" used for node #${i}`)
      }
      idToNode.set(n.id, n)
    })

    // Check parent existence
    const nodesWithParents = nodes.filter(n => n.parent)
    nodesWithParents.forEach((n, i) => {
      if (!idToNode.has(n.parent)) {
        throw new Error(`node #${i} references a non-existing parent: "${n.parent}"`)
      }
    })

    // Check for circular dependency
    nodesWithParents.forEach((n, i) => {
      const visited = new Set([n])
      const path = [n]
      while (n.parent) {
        n = idToNode.get(n.parent)
        if (visited.has(n)) {
          const pathStr = path.map(n => n.id ? `"${n.id}"` : 'anonymous').join('->')
          throw new Error(`circular dependency found: ${pathStr}`)
        }
        path.push(n)
        visited.add(n)
      }
    })

    // Create node objects
    nodes.forEach((n, i) => {
      const stack = []

      // First schedule creation so that parents are created first
      while (n) {
        // Check if the node object has already been created
        if (n.id && this.nodeMap.has(n.id)) {
          break
        }
        stack.push([n, i])
        n = n.parent ? idToNode.get(n.parent) : null
      }

      // Finally create the node objects
      while (stack.length) {
        [n, i] = stack.pop()
        const parent = n.parent ? this.nodeMap.get(n.parent) : null
        const code = n.code ? n.code : ''
        this.nodes[i] = new CodeNode(parent, code)
        if (n.id) {
          this.nodes[i].id = n.id
          this.nodeMap.set(n.id, this.nodes[i])
        }
      }
    })
  }
}

export default CodeTree


class CodeNode {
  constructor(parent, code) {
    this.id = null
    this.parent = parent
    this.code = code ? preprocess(code) : null
  }

  getPath() {
    const path = [n]
    let n = this.parent
    while (n) {
      path.push(n)
      n = n.parent
    }
    path.reverse()
    return path
  }

  async exec(stdoutCallback) {
    if (this.parent) {
      await this.parent.exec()
    }

    let stdout = ''
    let t0 = new Date()
    // TODO: integrate with brython here
    stdoutCallback('foo\n')
    stdout += 'foo\n'

    stdoutCallback('bar\n')
    stdout += 'bar\n'

    stdoutCallback(null)

    return {
      stdout,
      time: (new Date() - t0) / 1000,
    }
  }
}


export { CodeNode }


function preprocess(code) {
  let [lines, firstLine] = trimBlankLines(code.split(/\r?\n/))

  const padding = lines.length ? /^\s*/.exec(lines[0])[0] : ''

  const r = []

  // Remove padding from the lines
  let lineno = firstLine + 1
  for (let line of lines) {
    lineno++

    if (!line.length) {
      r.push('')
      continue
    }

    if (!line.startsWith(padding)) {
      throw new Error(`preprocess: line ${lineno} missing padding starting line`)
    }
    line = line.slice(padding.length)
    r.push(line)
  }

  return r.join('\n')
}


function trimBlankLines(lines) {
  // Ignore first blank lines
  let firstLine = 0
  while (firstLine < lines.length) {
    const line = lines[firstLine]
    if (/\S/.test(lines[firstLine])) {
      break
    }
    firstLine++
  }

  // Ignore last blank lines
  let lastLine = lines.length - 1
  while (lastLine >= 0) {
    if (/\S/.test(lines[lastLine])) {
      break
    }
    lastLine--
  }

  return [lines.slice(firstLine, lastLine + 1), firstLine]
}
