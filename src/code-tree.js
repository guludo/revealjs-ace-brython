import preprocess from './preprocessor.js'
import Runner from './runner.js'


class CodeTree {
  constructor(nodes) {
    this.nodeMap = new Map()
    this.nodes = new Array(nodes.length)
    this.runner = new Runner()

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
        this.nodes[i] = new CodeNode(parent, code, this.runner)
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
  constructor(parent, code, runner) {
    this.id = null
    this.parent = parent
    this.code = code ? preprocess(code) : null
    this.state = 'idle'
    this.originalCode = this.code
    this.stdout = new Output()
    this.stderr = new Output()
    this.runner = runner
    this.codeChangeCallbacks = new Set()
    this.stateChangeCallbacks = new Set()
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

  async exec() {
    let node = this
    const nodes = []
    while (node) {
      nodes.push(node)
      node = node.parent
    }
    nodes.reverse()

    if (nodes.some(n => n.state !== 'idle')) {
      throw new Error('not all nodes in the chain are idle')
    }

    for (let node of nodes) {
      node.setState('running')
      node.stdout.reset()
      node.stderr.reset()
    }

    const callbacks = {
      stdout({codeIdx, data}) {
        nodes[codeIdx].stdout.push(data)
      },
      stderr({codeIdx, data}) {
        nodes[codeIdx].stderr.push(data)
      },
    }

    try {
      await this.runner.run(nodes, callbacks)
    } finally {
      for (let node of nodes) {
        node.setState('idle')
      }
    }
  }

  resetCode(skipThisCallback) {
    this.setCode(this.originalCode, skipThisCallback)
  }

  setCode(code, skipThisCallback) {
    if (code === this.code) {
      return
    }
    this.code = code

    for (let cb of this.codeChangeCallbacks) {
      if (cb === skipThisCallback) {
        continue
      }
      try {
        cb(this.code, this)
      } catch (e) {
        console.error(`Error while calling code change callback: ${e}`)
      }
    }
  }

  setState(state) {
    const old = this.state
    this.state = state
    for (let cb of this.stateChangeCallbacks) {
      try {
        cb(this.state, old, this)
      } catch (e) {
        console.error(`Error while calling state change callback: ${e}`)
      }
    }
  }

  addCodeChangeCallback(callback) {
    this.codeChangeCallbacks.add(callback)
  }

  removeCodeChangeCallback(callback) {
    this.codeChangeCallbacks.delete(callback)
  }

  addStateChangeCallback(callback) {
    this.stateChangeCallbacks.add(callback)
  }

  removeStateChangeCallback(callback) {
    this.stateChangeCallbacks.delete(callback)
  }
}


class Output {
  constructor() {
    this.data = ''
    this.subscribers = new Set()
  }

  reset() {
    this.data = ''
    for (let s of this.subscribers) {
      s(null, this)
    }
  }

  push(data) {
    this.data += data
    for (let s of this.subscribers) {
      s(data, this)
    }
  }

  subscribe(subscriber) {
    this.subscribers.add(subscriber)
  }

  unsubscribe(subscriber) {
    this.subscribers.delete(subscriber)
  }
}
