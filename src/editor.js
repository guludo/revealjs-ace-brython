import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-python.js'


class Editor {
  constructor(container, codeNode) {
    this.codeNode = codeNode

    this.aceEditor = ace.edit(container, {
      mode: 'ace/mode/python',
    })
    this.aceEditor.on('change', () => {
      this.codeNode.setCode(this.aceEditor.getValue(), this.handleCodeNodeChange)
    })

    this.handleCodeNodeChange = (code) => {
      this.aceEditor.setValue(code)
    }
    this.codeNode.addCodeChangeCallback(this.handleCodeNodeChange)
  }

  destroy() {
    this.aceEditor.destroy()
    this.codeNode.removeCodeChangeCallback(this.handleCodeNodeChange)
  }
}

export default Editor
