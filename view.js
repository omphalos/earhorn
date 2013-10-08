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
    , column = +$el.attr('data-column')
    , line = +$el.attr('data-line')

  evt.codemirrorIgnore = true
  
  if(widget) {
    var isForThisLocation = 
      widget.line === location.line && widget.column === column
    removeWidget()
    if(isForThisLocation) return
  }

  widget = {
    el: $('<div class="widget"></div>'),
    line: line,
    column: column
  }

  editor.addWidget(
    { line: widget.line - 1, ch: widget.column },
    widget.el[0])

  pendingChange = true
})

function removeWidget() {
  if(!widget) return
  widget.el.remove()
  widget = null
}

function updateWidgetHtml() {
  
  if(!widget) return
    
  var lineLog = selectedScriptLog.lineLogs[widget.line]
    , log = lineLog[widget.column]

  var html = widget.el.html()
    , newHtml = buildWidgetHtml(log.value)
console.log('lineLog', lineLog, 'log', log)    
  if(html !== newHtml)
    widget.el.html(newHtml)  
}

function buildWidgetHtml(log) {

  var html = '\n'
  html += '<div class="widget-inner ' + log.type + '">\n'

  if(log.type === 'Object') {
    
    var propertyKeys = Object.keys(log.properties)
    
    propertyKeys.sort().forEach(function(p) {
      html += buildWidgetLineItem(log.properties, p)
    })
      
    if(!propertyKeys.length)
      html += log.type
    
    if(!log.complete)
      html += '<div><span>...<span></div>'
    
  } else if(log.type === 'Array') {
    
    for(var e = 0; e < log.elements.length; e++)
      html += buildWidgetLineItem(log.elements, e)
      
    if(!log.elements.length)
      html += log.type
    
  } else html += log.type

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
        
    url[val.script] = { lineLogs: {}, body: val.body }    
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
      , line = script.lineLogs[val.line] = script.lineLogs[val.line] || {}
      , column
      
      
    if(!(column = line[val.column]))
      column = line[val.column] = { column: val.column, line: val.line }

    column.value = val.val

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

    Object.keys(selectedScriptLog.lineLogs).forEach(function(line) {      
      
      var lineLog = selectedScriptLog.lineLogs[line]
        , columns = Object.keys(lineLog)

      columns.forEach(function(column) {
        
        var columnLog = lineLog[column]
          , logText = getLogText(columnLog.value)
          
        if(!columnLog.bookmark) {      
          var bookmarkHtml = ''
          bookmarkHtml += '<span class="bookmark" '
          bookmarkHtml += 'data-line="' + line + '" '
          bookmarkHtml += 'data-column="' + column + '" '
          bookmarkHtml += '></span>'
          columnLog.bookmarkWidget = $(bookmarkHtml)
          var pos = { line: line - 1, ch: +column }
            , options = {widget: columnLog.bookmarkWidget[0] }
          columnLog.bookmark = editor.setBookmark(pos, options)
        }
        
        columnLog.bookmarkWidget.html(logText)
      })
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

