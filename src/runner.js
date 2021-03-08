import BrythonRunner from 'brython-runner/lib/brython-runner.js'

import runnerPythonSource from './runner.py'

const MSG_TYPE_PREFIX = 'revealjs-ace-brython.'

class Runner {
  constructor() {
    this.createBrythonRunner()
    this.runSessionIdSeq = 0
    this.sessions = new Map()
    this.msgHandlers = {
      'exec-code-started': this.handleExecCodeStarted.bind(this),

      'exec-code-stdout-write': this.handleExecCodeStdoutWrite.bind(this),
      'exec-code-stdout-flush': this.handleExecCodeStdoutFlush.bind(this),
      'exec-code-stderr-write': this.handleExecCodeStderrWrite.bind(this),
      'exec-code-stderr-flush': this.handleExecCodeStderrFlush.bind(this),

      'exec-code-success': this.handleExecCodeSuccess.bind(this),
      'exec-code-error': this.handleExecCodeError.bind(this),

      'exec-success': this.handleExecSuccess.bind(this),
      'exec-error': this.handleExecError.bind(this),
    }
  }

  run(codeNodes, callbacks) {
    callbacks = {...callbacks}
    return new Promise((resolve, reject) => {
      const sessionId = this.runSessionIdSeq++
      const session = {
        codeNodes,
        callbacks,
        resolve,
        reject,
      }
      this.sessions.set(sessionId, session)
      const codes = codeNodes.map(n => n.code)
      this.sendMsg('exec', {session_id: sessionId, codes: codes})
    })
  }

  sendMsg(type, value) {
    type = `${MSG_TYPE_PREFIX}${type}`
    this.brythonRunner.sendMsg(type, value)
  }

  createBrythonRunner() {
    this.brythonRunner = new BrythonRunner({
      postInitScripts: [runnerPythonSource],
      // Use dummy stdout and stderr objects here because we handle output with
      // our own handlers.
      stdout: {write(content) {}, flush() {}},
      stderr: {write(content) {}, flush() {}},

      // Route messages with our prefix to our handlers
      onMsg: (type, value) => {
        if (!type.startsWith(MSG_TYPE_PREFIX)) {
          return
        }
        type = type.slice(MSG_TYPE_PREFIX.length)
        if (this.msgHandlers.hasOwnProperty(type)) {
          this.msgHandlers[type](value)
        } else {
          console.log(`Unhandled message of type '${type}'`, value)
        }
      },
    })
  }

  handleExecCodeStarted(data) {
    const session = this.sessions.get(data.session_id)
    if (!session.callbacks.codeStarted) {
      return
    }
    try {
      session.callbacks.codeStarted({codeIdx: data.code_idx})
    } catch {}
  }

  handleExecCodeStdoutWrite(data) {
    const session = this.sessions.get(data.session_id)
    if (!session.callbacks.stdout) {
      return
    }
    const codeIdx = data.code_idx
    try {
      session.callbacks.stdout({codeIdx: data.code_idx, data: data.data})
    } catch {}
  }

  handleExecCodeStdoutFlush(data) { /* Do nothing */ }

  handleExecCodeStderrWrite(data) {
    const session = this.sessions.get(data.session_id)
    if (!session.callbacks.stderr) {
      return
    }
    try {
      session.callbacks.stderr({codeIdx: data.code_idx, data: data.data})
    } catch {}
  }

  handleExecCodeStderrFlush(data) { /* Do nothing */ }

  handleExecCodeSuccess(data) {
    const session = this.sessions.get(data.session_id)
    if (!session.callbacks.codeSuccess) {
      return
    }
    try {
      session.callbacks.codeSuccess({codeIdx: data.code_idx})
    } catch {}
  }

  handleExecCodeError(data) {
    const session = this.sessions.get(data.session_id)
    if (!session.callbacks.codeError) {
      return
    }
    try {
      session.callbacks.codeError({codeIdx: data.code_idx, error: data.error})
    } catch {}
  }

  handleExecSuccess(data) {
    const session = this.sessions.get(data.session_id)
    session.resolve()
    this.sessions.delete(data.session_id)
  }

  handleExecError(data) {
    const session = this.sessions.get(data.session_id)
    session.reject(data.error)
    this.sessions.delete(data.session_id)
  }
}

export default Runner
