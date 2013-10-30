angular.module('main').factory('timeline', [
  '$rootScope', 
  'settingsService', function(
  $rootScope,
  settingsService) {

  'use strict'

  var settings = settingsService.load({
    requestInterval: 100,
    timelineLength: 100
  })

  var timeline = $rootScope.$new();
  timeline.listeningToLogs = true
  timeline.buffer = []
  
/*  function onAnnouncement(settings, log, history, record) {
    log[record.script] = {
      varLogs: {},
      body: record.body
    }
  }
  
  function onLog(record) {

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
      while(history.length > settings.historyLen)
        history.shift()
//      position = history.length - 1
    
      varLog.value = val.val
    
//      var isEventForSelectedScript =
//        val.script === selectedScript
          
//      if(isEventForSelectedScript)
//        pendingChange = true
          
//      if(log[selectedScript])
//        log[selectedScript].lastChange = val.loc
    }
    
    Object.keys(missingScripts).forEach(function(missingScript) {
      localStorage.setItem('earhorn-view', { type: 'echo' })
    })
  }
    */
    
  function onStorage(evt) {
    
    if(evt.key !== 'earhorn-log')
      return

    // Get the message.
    var payload = JSON.parse(evt.newValue)    
    if(payload.length > settings.timelineLength)
      throw 'payload size is too great'
    
    // Optionally ignore logs (useful when paused).
    var listenedEvents = payload.filter(function(record) {
      return timeline.listeningToLogs || record.type !== 'log'
    })
    
    // Add messages to end.
    timeline.buffer.splice(timeline.length, 0, listenedEvents)
    
    // Trim to fit.
    var overflow = timeline.length - settings.timelineLength
    timeline.buffer.splice(0, overflow)
    
    timeline.$emit('timeline', listenedEvents.length)
  }
  
  window.addEventListener('storage', onStorage, false)    
  
  timeline.$on('$destroy', function() {
    window.removeEventListener('storage', onStorage, false)
  })

  ///////////////////
  // requestScript //
  ///////////////////

  var scriptsToRequest = {}
  
  var sendDebouncedScriptRequest = _.debounce(function() {
    
    Object.keys(scriptsToRequest).forEach(function(script) {

      localStorage.setItem('earhorn-listener', JSON.parse({
        type: 'echo',
        script: script
      }))

      delete scriptsToRequest[script]
    })
    
  }, settings.requestInterval)

  timeline.requestScript = function(script) {
    scriptsToRequest[script] = script
    sendDebouncedScriptRequest()
  }

  //////////
  // done //
  //////////
  
  return timeline
}])
