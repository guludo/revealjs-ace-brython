import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'

import EditorTemplateHtml from './editor-template.html';

const EditorTemplate = document.createElement('template')
EditorTemplate.innerHTML = EditorTemplateHtml

class Editor {
  constructor(container, codeNode) {
    this.codeNode = codeNode

    this.handleCodeNodeChange = (code) => {
      this.aceEditor.setValue(code)
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
      this.codeNode.setCode(this.aceEditor.getValue(), this.handleCodeNodeChange)
    })
  }

  destroy() {
    this.aceEditor.destroy()
    this.codeNode.removeCodeChangeCallback(this.handleCodeNodeChange)
  }
}

export default Editor
