//////////
// View //
//////////

var options = JSON.parse(
  localStorage.earhornOptions ||
  JSON.stringify({
    historyLen: 100,
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
  , $continueMessage = $('.continue-message')
  , timelineMax = +$timeline.attr('max')
  , mode = 'playing'
  , history = []
  , $play = $('.play.icon')
  , $pause = $('.pause.icon')
  , position = history.length - 1
  
$timeline.val(options.historyLen)
$timeline.on('change', function(evt) {
  var val = +$timeline.val()
  if(val < timelineMax && mode === 'playing')
    pause()
  moveTo(Math.floor((history.length - 1) * val / timelineMax))
})

function moveTo(newPosition) {  

  if(!history.length) return position = 0
  
  while(position < newPosition) {
    position++
    var frame = history[position]
    log[selectedScript].varLogs[frame.loc].value = frame.current
    log[selectedScript].lastChange = frame.loc
  }
  
  while(position > newPosition) {
    var frame = history[position]
    log[selectedScript].varLogs[frame.loc].value = frame.previous
    position--
    log[selectedScript].lastChange = history[position].loc    
  }
  
  pendingChange = true
}

function pause() {
  $play.removeClass('active')
  $pause.addClass('active')
  mode = 'paused'
  pendingChange = true
}

function play() {
  
  if(selectedScript && mode === 'editing') {
    
    localStorage.setItem('earhorn-view', JSON.stringify({
      type: 'edit',
      script: selectedScript,
      body: editor.getValue(),
      reload: true
    }))
    
    history.length = 0
    delete log[selectedScript]
  }
  
  $play.addClass('active')
  $pause.removeClass('active')
  $continueMessage.removeClass('show')
  mode = 'playing'
  moveTo(history.length - 1)
  $timeline.val(timelineMax)
  pendingChange = true
}

$play.on('click', play)
$pause.on('click', pause)

$('.fast-backward.icon').on('click', function() {
  step(-position)
})
$('.fast-forward.icon').on('click', function() {
  step(history.length - position - 1)
})
$('.step-backward.icon').on('click', function() { step(-1) })
$('.step-forward.icon').on('click', function() { step(1) })

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

  if(!log[selectedScript] || !$el.length)
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
    
  var varLog = log[selectedScript].varLogs[widget.key]
  
  if(!varLog.value)
    return widget.el.hide()

  var html = widget.el.html()
    , newHtml = buildWidgetHtml(varLog.value)

  if(html !== newHtml) 
    widget.el.html(newHtml)  
    
  widget.el.show();
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
  , selectedScript

function onStorage(evt) {

  if(evt.key !== 'earhorn-log') {
    console.log(evt)
    return
  }

  var record = JSON.parse(evt.newValue)

  if(record.type === 'announcement') {
      
    // Handle a script snapshot.
  
    var newScript = !log[record.script]
          
    log[record.script] = { varLogs: {}, body: record.body }    
  
    if(newScript) {
  
      $('select').append(
        '<option value="' + record.script + '">' +
        record.script +
        '</option>')
    
      if(!selectedScript) {
        $('.script-view').show()
        $('#editor').show()
        loadSelectedScript()
      }
  
    } else {
      if(selectedScript == record.script)
        loadSelectedScript()
    }
  } else if(record.type === 'log' && mode === 'playing') {

    // If we're paused we don't want to be adjusting history.
    // Otherwise we have to somehow handle the user's historic
    // state dropping off from the history array.
    
    var missingScripts = {}
    
    for(var e = 0; e < record.buffer.length; e++) {
      
      var val = record.buffer[e]
  
      if(!log[val.script]) {
        // If we haven't seen the script body, ignore the event
        // Just request the body
        missingScripts[val.script] = true
        continue
      }
    
      // Handle a log message.        
      var scriptLog = log[val.script]
        , varLog = scriptLog.varLogs[val.loc]
        , historyFrame = { loc: val.loc, current: val.val }
          
      if(varLog)
        historyFrame.previous = varLog.value
    
      else {
    
        var fragments = val.loc.split(',')
          , start = { line: fragments[0], column: fragments[1] }
          , end = { line: fragments[2], column: fragments[3] }
          , loc = { start: start, end: end }
    
        varLog = scriptLog.varLogs[val.loc] = { loc: loc }
      }
        
      history.push(historyFrame)
      while(history.length > options.historyLen)
        history.shift()
      position = history.length - 1
    
      varLog.value = val.val
    
      var isEventForSelectedScript =
        val.script === selectedScript
          
      if(isEventForSelectedScript)
        pendingChange = true
          
      if(log[selectedScript])
        log[selectedScript].lastChange = val.loc
    }
    
    Object.keys(missingScripts).forEach(function(missingScript) { 
      localStorage.setItem('earhorn-view', JSON.stringify({
        type: 'echo',
        script: missingScript
      }))
    })
  }
}

var isLoadingScript = false
$('select').change(loadSelectedScript)
function loadSelectedScript() {

  history = []

  removeWidget()
    
  selectedScript = $('select').val()

  var tail = { line: editor.lineCount(), ch: 0 }
  isLoadingScript = true
  editor.replaceRange(log[selectedScript].body, { line: 0, ch: 0 }, tail)
  isLoadingScript = false

  pendingChange = true
}

function deleteBookmark(varLog) {
  if(!varLog.bookmark) return
  varLog.bookmark.clear()
  delete varLog.bookmark
  delete varLog.bookmarkWidget
}

var hoverItem;
var currentItem;
function draw() {

  if(pendingChange && selectedScript && log[selectedScript]) {

    removeCurrentItem()

    Object.keys(log[selectedScript].varLogs).forEach(function(key) {      
      
      var varLog = log[selectedScript].varLogs[key]
      
      if(!varLog.value) {
        // Rewinding and log is gone
        deleteBookmark(varLog)
        return
      }
      
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
        
        varLog.bookmarkWidget.hover(
          function mousenter() {
            removeHoverItem();
            hoverItem = {
              varLog: varLog,
              marker: editor.markText(
                { line: +varLog.loc.start.line - 1, ch: +varLog.loc.start.column},
                { line: +varLog.loc.end.line - 1, ch: +varLog.loc.end.column},
                { className: 'bookmark-loc' })
            }
          },
          function mouseleave() {
            removeHoverItem()
          })
      }

      var logText = '<span>' + getLogText(varLog.value) + '</span>'         
      varLog.bookmarkWidget.html(logText)
      
      if(log[selectedScript].lastChange === key && mode !== 'playing') {
        
        currentItem = {
          varLog: varLog,
          marker: editor.markText(
            { line: +varLog.loc.start.line - 1, ch: +varLog.loc.start.column},
            { line: +varLog.loc.end.line - 1, ch: +varLog.loc.end.column},
            { className: 'current-loc' })
        }

        varLog.bookmarkWidget.addClass('current')
      }
    })
    
    updateWidgetHtml()
    
    pendingChange = false
  }
  
  setTimeout(draw, options.interval)
}

function removeCurrentItem() {
  if(!currentItem) return
  currentItem.marker.clear()
  currentItem.varLog.bookmarkWidget.removeClass('current')
  currentItem = null
}

function removeHoverItem() {

  if(!hoverItem) return;
  hoverItem.marker.clear();
  hoverItem = null;
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

editor.on('change', function() {

  if(!selectedScript) return

  clearAllLogArtifacts()

  if(!isLoadingScript && mode !== 'editing') {
    $play.removeClass('active')
    $pause.addClass('active')
    $continueMessage.addClass('show')
    mode = 'editing'
  }
})

function clearAllLogArtifacts() {
  removeCurrentItem()
  removeHoverItem()

  var varLogs = log[selectedScript].varLogs

  Object.keys(varLogs).forEach(function(key) {
    var varLog = varLogs[key]
    deleteBookmark(varLog)
  })
}

setTimeout(draw)

// Subscribe to localStorage events.
if(window.addEventListener) window.addEventListener('storage', onStorage, false)
else if(window.attachEvent) window.attachEvent('onstorage', onStorage)

