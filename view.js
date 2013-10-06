//////////
// View //
//////////

var options = JSON.parse(
  localStorage.earhornOptions ||
  '{ "historyLen": "1", "interval": "0" }')

var openTag  = '\u2329' // unicode bracket
  , closeTag = '\u232a' // unicode bracket

CodeMirror.defineMode("earhorn-javascript", function(config, parserConfig) {

  var javascriptMode = CodeMirror.getMode(config, 'javascript')
    , javascriptModeToken = javascriptMode.token

  javascriptMode.token = function(stream, state) {

    if(!state.logging && stream.peek() == openTag) {
      stream.next()
      state.logging = 'log'
      return 'log-start'
    }

    if(state.logging === 'log') {
      var pos = stream.pos
      stream.next()
      if(stream.skipTo(closeTag)) {
        state.logging = 'log-end'
      } else {
        delete state.logging
        return 'error'
      }
      return 'log'
    }
    
    if(state.logging === 'log-end') {
      stream.next()
      delete state.logging
      return 'log-end'
    }

    return javascriptModeToken.apply(this, arguments)
  }

  return javascriptMode

})

var editor = CodeMirror($('#editor')[0], {
  mode:  "earhorn-javascript",
  fullScreen: true,
  lineNumbers: true,
  readOnly: true,
  cursorBlinkRate: 0
})

// Add widget on mousedown
var widget
editor.on('mousedown', function(editor, evt) {

  if(!selectedScriptLog) return
  if(evt.toElement.className === 'cm-log-start' ||
    evt.toElement.className === 'cm-log-end') {
    // TODO: get cm-log instead of aborting
    evt.codemirrorIgnore = true
    return
  }  
  if(evt.toElement.className !== 'cm-log') return

  var location = editor.coordsChar({
    top: evt.clientY,
    left: evt.clientX
  })
  
  var line = selectedScriptLog[location.line + 1]
  if(!line) return
    
  //////////////////////
  // Resolve the column.
  
  // Get all columns in the line.
  var lineElements = Array.prototype.slice.call(evt.
    toElement.
    parentNode.
    children)
    
  var filteredElements = lineElements.
    filter(function(el) {
      return el.className === 'cm-log'
    })

  var indexOfClickedElement = filteredElements.indexOf(evt.toElement)

  var columns = Object.
    keys(line).
    sort(function(x, y){ return +x > +y })
    
  var column = columns[indexOfClickedElement]

  evt.codemirrorIgnore = true

  if(widget) {
    widget.el.remove()
    if(
      widget.line === location.line && 
      widget.column === column) {
      widget = null
      return
    }
  }

  widget = {
    el: $('<div class="widget"></div>'),
    line: location.line,
    column: column
  }

  editor.addWidget(
    { line: location.line, ch: location.ch },
    widget.el[0])

  updateWidgetHtml()
})

function updateWidgetHtml() {
  
  if(!widget) return
    
  var linelog = selectedScriptLog[widget.line + 1]
    , log = linelog[widget.column]
    
  var html = widget.el.html()
    , newHtml = buildWidgetHtml(log)

  if(html !== newHtml)
    widget.el.html(newHtml)  
}

function buildWidgetHtml(log) {

  var html = '\n'
  html += '<div class="widget-inner">\n'

  if(log.type === 'Object') {
    
    Object.keys(log.properties).forEach(function(p) {
      html += buildWidgetLineItem(log.properties, p)
    })
    
  } else if(log.type === 'Array') {
    
    for(var e = 0; e < log.elements.length; e++)
      html += buildWidgetLineItem(log.elements, e)
    
  } else html += log.type

  html += '</div>\n'
  return html
}

function buildWidgetLineItem(rows, rowName) {
  html  = '<div>\n'
  html += '<span>' + rowName + '</span>\n'
  html += '<span>: </span>\n'
  html += '<span>' + getLogText(rows[rowName]) + '</span>\n'
  html += '</div>\n'
  return html
}

var log = {}
  , pendingChange = false
  , selectedScriptRef
  , selectedScriptLog

function onStorage(evt) {

  if(evt.key !== 'earhorn') return

  var val = JSON.parse(evt.newValue)
    , url = log[evt.url] = log[evt.url] || {}

  // Ignore events if we haven't seen the script body  
  if(!url[val.script] && !val.body) return
  
  if(val.body) {
    
    // Handle a script snapshot.

    var newScript = !url[val.script]
        
    url[val.script] = { body: val.body, lines: val.body.split('\n') }    
    var scriptRef = { url: evt.url, script: val.script }
      , scriptRefJSON = JSON.stringify(scriptRef)

    if(newScript) {

      $('select').append(
        '<option value="' + escape(scriptRefJSON) + '">' +
        val.script +
        '</option>')
  
      if($('#start-message').is(':visible')) {
        $('#start-message').hide()
        $('.script-view').show()
        loadSelectedScript()
      }
    } else {
      if(scriptRefJSON == JSON.stringify(selectedScriptRef))
        loadSelectedScript()
    }

  } else {

    // Handle a log message.        
    var script = url[val.script]
      , line = script[val.line] = script[val.line] || {}

    line[val.column] = val.val

    var isEventForSelectedScript =
      evt.url === selectedScriptRef.url &&
      val.script === selectedScriptRef.script
      
    if(isEventForSelectedScript)
      pendingChange = true
  }
}

$('select').change(loadSelectedScript)

function loadSelectedScript() {
  selectedScriptRef = JSON.parse(unescape($('select').val()))  
  selectedScriptLog = log[selectedScriptRef.url][selectedScriptRef.script]
  pendingChange = true
  draw()    
}

var lines

function draw() {

  if(pendingChange) {

    var newLines = selectedScriptLog.lines.map(function(lineText, lineIndex) {
      
      var lineLog = selectedScriptLog[lineIndex + 1]
      if(!lineLog) return lineText
      
      var columns = Object.
        keys(lineLog).
        sort(function(x, y) { return +x > +y })

      var c = columns.length

      while(c --> 0) {

        var column = columns[c]
          , obj = lineLog[column]
          
        lineText =
          lineText.slice(0, column) +
          openTag + getLogText(obj) + closeTag +
          lineText.slice(column)      
      }
      
      return lineText

    })
      
    if(!lines)  
      editor.setValue((lines = newLines).join('\n'))
      
    else {
      for(var i = 0; i < newLines.length; i++) {
        
        if(i < lines.length) {
          if(lines[i] !== newLines[i])
            editor.setLine(i, newLines[i])
        } else {
          var tail = newLines.slice(lines.length).join('\n')
            , location = { line: lines.length, ch: 0 }
          editor.replaceRange(tail, location, location)
          break
        }

        if(lines.length > newLines.length) {

          var from = { line: newLines.length, ch: 0 }
            , to = { line: lines.length, ch: 0 }

          // TODO: handle line clipping
          editor.replaceRange('', from, to)
        }
      }
      
      lines = newLines
    }
    
    updateWidgetHtml()
    
    pendingChange = false
  }
  
  setTimeout(draw, options.interval)
}

function getLogText(log) {

  if(log.type === 'String')
    return '"' + log.value + '"' + (log.clipped ? '...' : '')
    
  if(log.value)
    return log.value
      
  if(log.type === 'Array')
    return 'Array(' + log.length + ')'
        
  if(log.type === 'Object')        
    return log.constructor || log.type
          
  return log.type
}

setTimeout(draw)

// Subscribe to localStorage events.
if(window.addEventListener) window.addEventListener('storage', onStorage, false)
else if(window.attachEvent) window.attachEvent('onstorage', onStorage)

