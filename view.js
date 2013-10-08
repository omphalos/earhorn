//////////
// View //
//////////

var options = JSON.parse(
  localStorage.earhornOptions ||
  '{ "historyLen": "1", "interval": "0" }')

var editor = CodeMirror($('#editor')[0], {
  mode:  'text/javascript',
  fullScreen: true,
  lineNumbers: true,
  readOnly: true
})

// Add widget on mousedown
var widget
editor.on('mousedown', function(editor, evt) {

  if($(evt.toElement).closest('.widget').length)
    return

  if(!selectedScriptLog || evt.toElement.className !== 'bookmark')
    return removeWidget()

  var $el = $(evt.toElement)
    , startLine = +$el.attr('data-start-line')
    , startColumn = +$el.attr('data-start-column')
    , endLine = +$el.attr('data-end-line')
    , endColumn = +$el.attr('data-end-column')
    , start = { line: startLine, column: startColumn }
    , end = { line: endLine, column: endColumn }
    , loc = { start: start, end: end }
    , key = JSON.stringify(loc)

  evt.codemirrorIgnore = true
  
  if(widget) {
    var isForThisLocation = widget.key === key
    removeWidget()
    if(isForThisLocation) return
  }

  widget = {
    el: $('<div class="widget"></div>'),
    key: key
  }

  editor.addWidget({ line: endLine - 1, ch: endColumn }, widget.el[0])

  pendingChange = true
})

function removeWidget() {
  if(!widget) return
  widget.el.remove()
  widget = null
}

function updateWidgetHtml() {
  
  if(!widget) return
    
  var varLog = selectedScriptLog.varLogs[widget.key]

  var html = widget.el.html()
    , newHtml = buildWidgetHtml(varLog.value)

  if(html !== newHtml)
    widget.el.html(newHtml)  
}

function buildWidgetHtml(varLog) {

  var html = '\n'
  html += '<div class="widget-inner ' + varLog.type + '">\n'

  if(varLog.type === 'Object') {
    
    var propertyKeys = Object.keys(varLog.properties)
    
    propertyKeys.sort().forEach(function(p) {
      html += buildWidgetLineItem(varLog.properties, p)
    })
      
    if(!propertyKeys.length)
      html += varLog.type
    
    if(!varLog.complete)
      html += '<div><span>...<span></div>'
    
  } else if(varLog.type === 'Array') {
    
    for(var e = 0; e < varLog.elements.length; e++)
      html += buildWidgetLineItem(varLog.elements, e)
      
    if(!varLog.elements.length)
      html += varLog.type
    
  } else html += varLog.type

  html += '</div>\n'
  return html
}

function buildWidgetLineItem(rows, rowName) {
  
  var value = rows[rowName]
  
  html = '<div title="' + value.type + '">\n'
  html += '<span class="widget-label ' + value.type + '">' + 
    rowName + (value.type === 'Function' ? '()' : '') + '</span>\n'
  html += '<span class="widget-separator">: </span>\n'  
  html += '<span class="widget-value ' + value.type + '">' + 
    getLogText(value) + '</span>\n'
  html += '</div>\n'
  return html
}

///////////////
// onStorage //
///////////////

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
        
    url[val.script] = { varLogs: {}, body: val.body }    
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
      , varLog = script.varLogs[val.loc]
      
    if(!varLog) {

      var loc = JSON.parse(val.loc)

      varLog = script.varLogs[val.loc] = {
        loc: loc
      }
    }

    varLog.value = val.val

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

  var tail = { line: editor.lineCount(), ch: 0 }
  editor.replaceRange(selectedScriptLog.body, { line: 0, ch: 0 }, tail)
}

function draw() {

  if(pendingChange) {

    Object.keys(selectedScriptLog.varLogs).forEach(function(key) {      
      
      var varLog = selectedScriptLog.varLogs[key]
        , logText = getLogText(varLog.value)
      
      if(!varLog.bookmark) {      
        var bookmarkHtml = ''
        bookmarkHtml += '<span class="bookmark" '
        bookmarkHtml += 'data-start-line="' + varLog.loc.start.line + '" '
        bookmarkHtml += 'data-start-column="' + varLog.loc.start.column + '" '
        bookmarkHtml += 'data-end-line="' + varLog.loc.end.line + '" '
        bookmarkHtml += 'data-end-column="' + varLog.loc.end.column + '" '
        bookmarkHtml += '></span>'
        varLog.bookmarkWidget = $(bookmarkHtml)
        var pos = { line: varLog.loc.end.line - 1, ch: varLog.loc.end.column }
        , options = {widget: varLog.bookmarkWidget[0], insertLeft: 1 }
        varLog.bookmark = editor.setBookmark(pos, options)
      }
      
      varLog.bookmarkWidget.html(logText)
    })
    
    updateWidgetHtml()    
    
    pendingChange = false
  }
  
  setTimeout(draw, options.interval)
}

function getLogText(log) {

  if(log.type === 'String')
    return '"' + log.value + '"' + (log.clipped ? '...' : '')
    
  if(log.type === 'Function')
    return log.name || log.type
    
  if(typeof log.value !== 'undefined')
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

