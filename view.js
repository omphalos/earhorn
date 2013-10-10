//////////
// View //
//////////

var options = JSON.parse(
  localStorage.earhornOptions ||
  JSON.stringify({
    historyLen: 1000,
    interval: 0,
    formatDigits: 2
  }))

var editor = CodeMirror($('#editor')[0], {
  mode:  'text/javascript',
  fullScreen: true,
  lineNumbers: true
})

// Set up timeline
var $timeline = $('input[type=range]')
  , timelineMax = +$timeline.attr('max')
  , playStatus = 'playing'
  , history = []
  , $play = $('.play.icon')
  , $pause = $('.pause.icon')
  , $stepForward = $('.step-forward.icon')
  , $stepBackward = $('.step-backward.icon')
  , position = history.length - 1
  
$timeline.val(options.historyLen)
$timeline.on('change', function(evt) {
  var val = +$timeline.val()
  if(val < timelineMax && playStatus !== 'paused')
    pause()
  moveTo(Math.floor((history.length - 1) * val / timelineMax))
})

function moveTo(newPosition) {  

  if(!history.length) return position = 0
  
  while(position < newPosition) {
    position++
    var frame = history[position]
    selectedScriptLog.varLogs[frame.loc].value = frame.current
    selectedScriptLog.lastChange = frame.loc
  }
  
  while(position > newPosition) {
    var frame = history[position]
    selectedScriptLog.varLogs[frame.loc].value = frame.previous
    position--
    selectedScriptLog.lastChange = history[position].loc    
  }
  
  pendingChange = true
}

function pause() {
  $play.removeClass('active')
  $pause.addClass('active')
  playStatus = 'paused'
}

function play() {
  $play.addClass('active')
  $pause.removeClass('active')
  playStatus = 'playing'
  moveTo(history.length - 1)
  $timeline.val(timelineMax)
}

$play.on('click', play)
$pause.on('click', pause)

$stepBackward.on('click', function() { step(-1) })

$stepForward.on('click', function() { step(1) })

function step(amount) {
  pause()
  var newPosition = position + amount
  if(newPosition < history.length && newPosition >= 0)
    moveTo(position + amount)
  if(history.length)
    $timeline.val((timelineMax * position / (history.length - 1)).toFixed())
  else $timeline.val(timelineMax)
}

// Add widget on mousedown
var widget
editor.on('mousedown', function(editor, evt) {

  if($(evt.toElement).closest('.widget').length)
    return

  var $el = $(evt.toElement).closest('.bookmark')

  if(!selectedScriptLog || !$el.length)
    return removeWidget()

  var startLine = +$el.attr('data-start-line')
    , startColumn = +$el.attr('data-start-column')
    , endLine = +$el.attr('data-end-line')
    , endColumn = +$el.attr('data-end-column')
    , start = { line: startLine, column: startColumn }
    , end = { line: endLine, column: endColumn }
    , loc = { start: start, end: end }

  var key = [
    loc.start.line,
    loc.start.column,
    loc.end.line,
    loc.end.column
  ].join(',')

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
  
  if(!varLog.value)
    return widget.el.hide()
  else widget.el.show()

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
      
    if(varLog.elements.length < varLog.length)
      html += '<div>...</div>'
      
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
  
      if(!selectedScriptRef) {
        loadSelectedScript()
        $('.script-view').show()
        $('#editor').show()
      }

    } else {
      if(scriptRefJSON == JSON.stringify(selectedScriptRef))
        loadSelectedScript()
    }

  } else if(playStatus !== 'paused') {

    // If we're paused we don't want to be adjusting history.
    // Otherwise we have to somehow handle the user's historic
    // state dropping off from the history array.

    // Handle a log message.        
    var script = url[val.script]
      , varLog = script.varLogs[val.loc]
      , historyFrame = { loc: val.loc, current: val.val }
      
    if(varLog)
      historyFrame.previous = varLog.value

    else {

      var fragments = val.loc.split(',')
        , start = { line: fragments[0], column: fragments[1] }
        , end = { line: fragments[2], column: fragments[3] }
        , loc = { start: start, end: end }

      varLog = script.varLogs[val.loc] = { loc: loc }
    }
    
    history.push(historyFrame)
    while(history.length > options.historyLen)
      history.shift()
    position = history.length - 1

    varLog.value = val.val

    var isEventForSelectedScript =
      selectedScriptRef &&
      evt.url === selectedScriptRef.url &&
      val.script === selectedScriptRef.script
      
    if(isEventForSelectedScript)
      pendingChange = true
      
    if(selectedScriptLog)
      selectedScriptLog.lastChange = val.loc
  }
}

$('select').change(loadSelectedScript)

function loadSelectedScript() {

  history = []

  removeWidget()
    
  selectedScriptRef = JSON.parse(unescape($('select').val()))  
  selectedScriptLog = log[selectedScriptRef.url][selectedScriptRef.script]

  var tail = { line: editor.lineCount(), ch: 0 }
  editor.replaceRange(selectedScriptLog.body, { line: 0, ch: 0 }, tail)
}

function draw() {

  if(pendingChange) {

    Object.keys(selectedScriptLog.varLogs).forEach(function(key) {      
      
      var varLog = selectedScriptLog.varLogs[key]
      
      if(!varLog.value) {
        // Rewinding and log is gone
        if(varLog.bookmark) {
          varLog.bookmark.clear()
          delete varLog.bookmark
          delete varLog.bookmarkWidget
        }
        return
      }
      
      var logText = 
        '<span' + 
        (selectedScriptLog.lastChange === key ? ' class="current">' : '>') +
        getLogText(varLog.value) + 
        '</span>'
      
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

function htmlEscape(str) {
  
  var entityMap = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', 
    '"': '&quot;', '\'': '&#39;', '/': '&#x2F;' 
  }

  return str.replace(/[&<>"'\/]/g, function (s) {
    return entityMap[s];
  })
}

function getLogText(log) {

  if(log.type === 'String')
    return '"' + htmlEscape(log.value) + '"' + (log.clipped ? '...' : '')
    
  if(log.type === 'Number') {
    if(!log.value || !options.formatDigits) return log.value
    return log.value.toFixed(options.formatDigits)
  }
    
  if(log.type === 'Function')
    return log.name || log.type
    
  if(typeof log.value !== 'undefined')
    return '' + log.value
      
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

