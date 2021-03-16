import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'
import 'ace-builds/src-noconflict/theme-pastel_on_dark.js'

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
  'lineNumber': {
    type: 'string',
    default: '1',
  },
  'minLines': {
    type: 'string',
    default: '1',
  },
  'maxLines': {
    type: 'string',
    default: '1000',
  },
}


const stateAttributesFilter = Object.keys(stateAttributes).map(k => {
  const conf = stateAttributes[k]
  const target = 'target' in conf ? conf.target : k
  return 'data-' + target.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
})


function stateAttributeStrToValue(conf, s) {
  const type = 'type' in conf ? conf.type : 'string'
  switch (type) {
  case 'bool':
    return s === '' || s === 'true'
  case 'string':
    return s.toString()
    break
  default:
    throw new Error(`unknown attribute type in configuration: ${type}`)
  }
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
        value = stateAttributeStrToValue(conf, this.container.dataset[k])
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

  handleStateAttributeChange(attr, newValue, oldValue) {
    switch (attr) {
    case 'lineNumber':
      const cursor = this.aceEditor.selection.getCursor()
      const newRow = parseInt(newValue)
      if (!isNaN(newRow) && 1 <= newRow) {
        this.aceEditor.gotoLine(newRow, cursor.column, true)
      }
      break
    case 'minLines':
    case 'maxLines':
        newValue = parseInt(newValue)
        if (isNaN(newValue)) {
          newValue = undefined
        }
        this.aceEditor.setOption(attr, newValue)
        break
    default:
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
      theme: 'ace/theme/pastel_on_dark',
      minLines: parseInt(this.state.minLines) ?
                  parseInt(this.state.minLines) : undefined,
      maxLines: parseInt(this.state.maxLines) ?
                  parseInt(this.state.maxLines) : undefined,
    })
    this.aceEditor.on('change', () => {
      this.codeNodeChangeSkipSetValue = true
      this.codeNode.setCode(this.aceEditor.getValue())
      this.codeNodeChangeSkipSetValue = false
    })
    this.aceEditor.selection.on('changeCursor', () => {
      const cursor = this.aceEditor.selection.getCursor()
      if ((cursor.row + 1) != this.state.lineNumber) {
        this.update({lineNumber: (cursor.row + 1).toString()})
      }
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

    this.stateAttributeObserver = new MutationObserver((mutations) => {
      const stateMutation = {}
      for (let m of mutations) {
        const name = m.attributeName.slice('data-'.length)
                                    .replace(/-[a-z]/g, s => s.slice(1).toUpperCase())
        const newValue = m.target.getAttribute(m.attributeName)
        const oldValue = m.oldValue

        if (newValue === oldValue) {
          continue
        }

        this.handleStateAttributeChange(name, newValue, oldValue)
        const conf = stateAttributes[name]
        stateMutation[name] = stateAttributeStrToValue(conf, newValue)
      }
      this.update(stateMutation, {updateAttributes: false})
    })
    this.stateAttributeObserver.observe(this.container, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: stateAttributesFilter,
    })
  }

  update(stateUpdate, options) {
    options = {...{updateAttributes: true}, ...options}
    this.state = {...this.state, ...stateUpdate}

    if (options.updateAttributes) {
      this.updateAttributes(this.state)
    }

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
    this.stateAttributeObserver.disconnect()
    Object.keys(this).forEach(k => delete this[k])
  }
}

export default Editor
