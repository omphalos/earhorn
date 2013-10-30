angular.module('main').factory('programLog', ['settingsService', function(settingsService) {

  'use strict'

  function onAnnouncement(settings, log, history, record) {
    log[record.script] = {
      varLogs: {},
      body: record.body
    }
  }
  
  function onLog(settings, log, history, record) {

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

  function attach($scope, log, history, settings) {
    
    settings.historyLen = settings.historyLen || 1000
    
    function onStorage(evt) {
    
      if(evt.key !== 'earhorn-log')
        return

      var record = JSON.parse(evt.newValue)
        , handlers = { announcement: onAnnouncement, log: onLog }
        , handler = handlers[record.type]

      handler(settings, log, history, record)
    }

    window.addEventListener('storage', onStorage, false)    
    
    $scope.$on('$destroy', function() {
      window.removeEventListener('storage', onStorage, false)
    })

  }

  return { attach: attach }
}])
