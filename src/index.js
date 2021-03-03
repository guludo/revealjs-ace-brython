import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'

import { CodeNode } from './code-tree.js'


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

    this.deck.on('ready', this.handleReady.bind(this))
  }

  handleReady() {
    this.editorContainers = [...this.deck.getRevealElement().querySelectorAll(this.config.selector)]
    for (let c of this.editorContainers) {
      this.configureEditor(c)
    }
  }

  configureEditor(container) {
    const scriptElement = container.querySelector(':scope > script[type="text/ace-brython"]')
    let code;
    if (scriptElement) {
      code = scriptElement.textContent;
    } else {
      code = container.textContent;
    }

    const codeNode = new CodeNode(null, code)
    container.textContent = codeNode.code

    ace.edit(container, {
      mode: 'ace/mode/python',
    })
  }
}
