import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'

import EditorTemplateHtml from './editor-template.html';

const EditorTemplate = document.createElement('template')
EditorTemplate.innerHTML = EditorTemplateHtml

const stateAttributes = {
  'readonly': {
    type: 'bool',
    default: false,
  },
  'components': {
    type: 'string',
    default: 'code buttons output',
  },
}

class Editor {
  constructor(container, codeNode) {
    this.codeNode = codeNode
    this.state = {}

    this.container = container

    this.processInitialAttributes()
    this.configCodeNode()
    this.buildElements()
    this.update()
  }

  processInitialAttributes() {
    for (let k of Object.keys(stateAttributes)) {
      const conf = stateAttributes[k]
      const target = 'target' in conf ? conf.target : k
      const defaultValue = 'default' in conf ? conf.default : null

      let value = defaultValue
      if (k in this.container.dataset) {
        const v = this.container.dataset[k]
        const type = 'type' in conf ? conf.type : 'string'

        switch (type) {
        case 'bool':
          value = v === '' || v === 'true'
          break
        case 'string':
          value = v.toString()
          break
        default:
          throw new Error(`unknown attribute type in configuration: ${type}`)
        }
      }
      this.state[target] = value
    }
  }

  updateAttributes(state) {
    for (let k of Object.keys(stateAttributes)) {
      const conf = stateAttributes[k]
      const target = 'target' in conf ? conf.target : k
      let value = state[target]
      const type = 'type' in conf ? conf.type : 'string'

      switch (type) {
      case 'bool':
        value = value ? 'true' : 'false'
        break
      }
      this.container.dataset[k] = value
    }

  }

  configCodeNode() {
    this.codeNodeChangeSkipSetValue = false
    this.handleCodeNodeChange = (code) => {
      if (!this.codeNodeChangeSkipSetValue) {
        this.aceEditor.setValue(code)
      }
      this.update()
    }

    this.handleNodeStdout = (data) => {
      if (data === null) {
        for (let element of this.output.querySelectorAll('.stdout')) {
          element.remove()
        }
      } else {
        const span = this.output.appendChild(document.createElement('span'))
        span.className = 'stdout'
        span.textContent = data
      }
    }

    this.handleNodeStderr = (data) => {
      if (data === null) {
        for (let element of this.output.querySelectorAll('.stderr')) {
          element.remove()
        }
      } else {
        const span = this.output.appendChild(document.createElement('span'))
        span.className = 'stderr'
        span.textContent = data
      }
    }

    this.state.nodeState = this.codeNode.state
    this.handleNodeStateChange = (state) => {
      this.update({nodeState: state})
    }

    this.codeNode.addCodeChangeCallback(this.handleCodeNodeChange)
    this.codeNode.addStateChangeCallback(this.handleNodeStateChange)
    this.codeNode.stdout.subscribe(this.handleNodeStdout)
    this.codeNode.stderr.subscribe(this.handleNodeStderr)
  }

  buildElements() {
    const shadow = this.container.attachShadow({mode: 'open'})
    shadow.appendChild(EditorTemplate.content.cloneNode(true))

    this.aceElement = this.container.appendChild(document.createElement('div'))
    this.aceElement.slot = 'editor'
    this.aceElement.style.fontSize = '1em'
    this.aceElement.style.width = '100%'
    this.aceElement.style.height = '100%'
    this.aceElement.textContent = this.codeNode.code
    this.aceEditor = ace.edit(this.aceElement, {
      mode: 'ace/mode/python',
      hasCssTransforms: true,
    })
    this.aceEditor.on('change', () => {
      this.codeNodeChangeSkipSetValue = true
      this.codeNode.setCode(this.aceEditor.getValue())
      this.codeNodeChangeSkipSetValue = false
    })
    this.aceEditor.commands.addCommand({
      name: 'runcode',
      bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
      exec: () => {
        this.runButton.click()
      },
    })


    this.root = shadow.getElementById('root')

    this.output = shadow.getElementById('output')

    this.clearButton = shadow.getElementById('clear-button')
    this.clearButton.onclick = () => {
      this.codeNode.resetCode()
    }

    this.runButton = shadow.getElementById('run-button')
    this.runButton.onclick = () => {
      this.codeNode.exec()
    }
  }

  update(stateUpdate) {
    this.state = {...this.state, ...stateUpdate}

    this.updateAttributes(this.state)

    const running = this.state.nodeState === 'running'

    this.aceEditor.setOption('readOnly', this.state.readonly)

    this.root.classList.toggle('edited', this.codeNode.code !== this.codeNode.originalCode)
    this.root.classList.toggle('running', running)

    this.runButton.disabled = running
    this.runButton.querySelector('span').textContent = running ? 'Running...' : 'Run'

    const showComponents = new Set(this.state.components.split(/\s+/))
    this.root.classList.toggle('code-hidden', !showComponents.has('code'))
    this.root.classList.toggle('buttons-hidden', !showComponents.has('buttons'))
    this.root.classList.toggle('output-hidden', !showComponents.has('output'))
  }

  destroy() {
    this.aceEditor.destroy()
    this.codeNode.removeCodeChangeCallback(this.handleCodeNodeChange)
    this.codeNode.removeStateChangeCallback(this.handleNodeStateChange)
    this.codeNode.stdout.unsubscribe(this.handleNodeStdout)
    this.codeNode.stderr.unsubscribe(this.handleNodeStderr)
    this.container.innerHTML = ''
    Object.keys(this).forEach(k => delete this[k])
  }
}

export default Editor
