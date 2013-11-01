angular.module('main').factory('logClient', [
  '$rootScope', 
  'settingsService', function(
  $rootScope,
  settingsService) {

  'use strict'

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
    
  /////////////////
  // Intiialize. //
  /////////////////
  
  var settings = settingsService.load({ historyLength: 100 })
    , logClient = $rootScope.$new()
    , listeningToLogs = true
    , allAnnouncements = {}
    , pendingAnnouncements = null
    , pendingScriptRequests = {}
    , isPauseNotificationPending = false
    , handlers = {}

  logClient.buffer = []
  
  /////////////////
  // Play/Pause. //
  /////////////////
  
  logClient.play = function() {
    listeningToLogs = true
  }

  logClient.pause = function() {
    isPauseNotificationPending = true
    listeningToLogs = false
  }
  
  ////////////////////////////////////////////
  // Handle storage events (main listener). //
  ////////////////////////////////////////////

  function onStorage(evt) {
    
    if(evt.key !== 'earhorn-log')
      return

    // Read the records
    var recordsToPublish = JSON.parse(evt.newValue).filter(function(record) {
      return handlers[record.type](record)
    })
    
    // Handlers can add records to logClient.buffer.
    // Let's trim it to fit.
    var overflow = logClient.length - settings.historyLength
    logClient.buffer.splice(0, overflow)
    
    // Request scripts whose announcements we haven't heard.
    Object.keys(pendingScriptRequests).forEach(function(script) {

      localStorage.setItem('earhorn-listener', JSON.parse({
        type: 'echo',
        script: script
      }))

      delete pendingScriptRequests[script]
    })
    
    // Publish the records to anyone listening.
    logClient.$emit('main.logClient', recordsToPublish)
  }
  
  //////////////////////////////////
  // Handle announcement records. //
  //////////////////////////////////
    
  handlers.announcement = function(record) {

    pendingAnnouncements = pendingAnnouncements || {}
    pendingAnnouncements[record.script] = record.body

    allAnnouncements[record.script] = record.body
  }
  
  /////////////////////////
  // Handle log records. //
  /////////////////////////
    
  handlers.log = function(record) {
    
    // Ignore logs when paused.
    if(!listeningToLogs)
      return false
    
    // Ignore unannounced scripts and queue them up for requesting later.
    if(!allAnnouncements[record.script]) {
      pendingScriptRequests[record.script] = true
      return false
    }

    // Add any pending announcements to this record, publishing them together.
    if(pendingAnnouncements) {
      record.announcements = pendingAnnouncements
      pendingAnnouncements = null
    }
    
    // Notify when a pause is over, since logs are lost in the interim.
    if(isPauseNotificationPending && !listeningToLogs) {
      isPauseNotificationPending = false
      record.isAfterPause = true
    }

    logClient.buffer.push(record)
    
    return true
  }
  
  //////////////////////////////////////
  // Manage storage event life cycle. //
  //////////////////////////////////////
  
  window.addEventListener('storage', onStorage, false)    
  
  logClient.$on('$destroy', function() {
    window.removeEventListener('storage', onStorage, false)
  })


  ///////////////
  // All done. //
  ///////////////
  
  return logClient
}])
