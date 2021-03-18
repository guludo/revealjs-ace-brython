import CodeTree from './code-tree.js'
import Editor from './editor.js'


export default {
  id: 'revealjs-ace-brython',
  init: (deck) => {
    new Plugin(deck)
  },
  withConfig: (config) => ({
    id: 'revealjs-ace-brython',
    init: (deck) => {
      new Plugin(deck, config)
    },
  }),
}


const defaultConfig = {
  selector: '.ace-brython',
}


class Plugin {
  constructor(deck, config) {
    this.deck = deck

    if (typeof config === 'undefined') {
      config = {...defaultConfig}
    } else {
      config = {...defaultConfig, ...config}
    }
    this.config = config

    this.createCodeTree()
    this.editorContainers = [...this.deck.getRevealElement().querySelectorAll(this.config.selector)]
    for (let c of this.editorContainers) {
      this.configureEditor(c)
    }
  }

  createCodeTree() {
    const allScripts = [...this.deck.getRevealElement().querySelectorAll('script[type="text/x.ace-brython"]')]

    const scripts = allScripts.filter(s => !('ref' in s.dataset && s.dataset.ref))
    const refs = allScripts.filter(s => 'ref' in s.dataset && s.dataset.ref)

    const idToScript = new Map()

    // Create nodes configuration objects
    const nodes = scripts.map(s => {
      const n = {}
      if ('id' in s.dataset && s.dataset.id) {
        n.id = s.dataset.id
      }

      if ('parent' in s.dataset && s.dataset.parent) {
        n.parent = s.dataset.parent
      }
      n.code = s.textContent
      return n
    })

    // Construct the tree
    this.codeTree = new CodeTree(nodes)

    // Bind code nodes to script elements
    this.scriptToCodeNode = new WeakMap()
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i]
      const node = this.codeTree.nodes[i]
      this.scriptToCodeNode.set(s, node)
    }
    for (let s of refs) {
      const id = s.dataset.ref
      if (!this.codeTree.nodeMap.has(id)) {
        throw new Error(`invalid reference to script "${id}"`)
      }
      this.scriptToCodeNode.set(s, this.codeTree.nodeMap.get(id))
    }
  }

  configureEditor(container) {
    const scriptElement = container.querySelector(':scope > script[type="text/x.ace-brython"]')
    if (!scriptElement) {
      return
    }
    const node = this.scriptToCodeNode.get(scriptElement)
    const editor = new Editor(container, node)
  }
}
