function preprocess(code) {
  let [lines, firstLine] = trimBlankLines(code.split(/\r?\n/))

  const padding = lines.length ? /^\s*/.exec(lines[0])[0] : ''

  const r = []

  // Remove padding from the lines
  let lineno = firstLine + 1
  for (let line of lines) {
    lineno++

    if (!line.length) {
      r.push('')
      continue
    }

    if (!line.startsWith(padding)) {
      throw new Error(`preprocess: line ${lineno} missing padding starting line`)
    }
    line = line.slice(padding.length)
    r.push(line)
  }

  return r.join('\n')
}

export default preprocess


function trimBlankLines(lines) {
  // Ignore first blank lines
  let firstLine = 0
  while (firstLine < lines.length) {
    const line = lines[firstLine]
    if (/\S/.test(lines[firstLine])) {
      break
    }
    firstLine++
  }

  // Ignore last blank lines
  let lastLine = lines.length - 1
  while (lastLine >= 0) {
    if (/\S/.test(lines[lastLine])) {
      break
    }
    lastLine--
  }

  return [lines.slice(firstLine, lastLine + 1), firstLine]
}
