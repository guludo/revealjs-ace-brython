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
    this.codeNode.addCodeChangeCallback(this.handleCodeNodeChange)
    this.codeNode.stdout.subscribe(this.handleNodeStdout)
    this.codeNode.stderr.subscribe(this.handleNodeStderr)

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
      try {
        await this.codeNode.exec()
      } finally {
        this.runButton.disabled = false
        this.runButton.querySelector('span').textContent = 'Run'
        this.root.classList.toggle('running', false)
      }
    }
  }

  update() {
    this.root.classList.toggle('edited', this.codeNode.code !== this.codeNode.originalCode)
  }

  destroy() {
    this.aceEditor.destroy()
    this.codeNode.removeCodeChangeCallback(this.handleCodeNodeChange)
    this.codeNode.stdout.unsubscribe(this.handleNodeStdout)
    this.codeNode.stderr.unsubscribe(this.handleNodeStderr)
    this.container.innerHTML = ''
    Object.keys(this).forEach(k => delete this[k])
  }
}

export default Editor
