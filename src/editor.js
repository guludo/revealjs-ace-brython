import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'

import EditorTemplateHtml from './editor-template.html';

const EditorTemplate = document.createElement('template')
EditorTemplate.innerHTML = EditorTemplateHtml

class Editor {
  constructor(container, codeNode) {
    this.codeNode = codeNode

    let codeNodeChangeSkipSetValue = false
    this.handleCodeNodeChange = (code) => {
      if (!codeNodeChangeSkipSetValue) {
        this.aceEditor.setValue(code)
      }
      this.update()
    }
    this.codeNode.addCodeChangeCallback(this.handleCodeNodeChange)

    this.container = container
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
    })
    this.aceEditor.on('change', () => {
      codeNodeChangeSkipSetValue = true
      this.codeNode.setCode(this.aceEditor.getValue())
      codeNodeChangeSkipSetValue = false
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
    this.runButton.onclick = async () => {
      this.runButton.disabled = true
      this.runButton.querySelector('span').textContent = 'Running...'
      this.root.classList.toggle('running', true)
      this.output.textContent = ''
      const result = await this.codeNode.exec((partialOut) => {
        if (partialOut == null) {
          return
        }
        this.output.textContent += partialOut
      })
      this.runButton.disabled = false
      this.runButton.querySelector('span').textContent = 'Run'
      this.root.classList.toggle('running', false)
    }
  }

  update() {
    this.root.classList.toggle('edited', this.codeNode.code !== this.codeNode.originalCode)
  }

  destroy() {
    this.aceEditor.destroy()
    this.codeNode.removeCodeChangeCallback(this.handleCodeNodeChange)
    this.container.innerHTML = ''
    Object.keys(this).forEach(k => delete this[k])
  }
}

export default Editor
