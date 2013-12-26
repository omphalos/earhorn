angular.module('main').factory('logClient', [
  '$rootScope', function(
  $rootScope) {

  'use strict'

  /////////////////
  // Intiialize. //
  /////////////////
  
  var logClient = $rootScope.$new()
    , allAnnouncements = {}
    , pendingAnnouncements = null
    , pendingScriptRequests = {}
    , isPauseNotificationPending = false
    , handlers = {}

  logClient.buffer = []
  logClient.playing = true
  
  ////////////////////
  // requestScripts //
  ////////////////////
  
  logClient.requestScripts = function(scripts) {
    
    // Request scripts whose announcements we haven't heard.
    scripts.forEach(function(script) {

      localStorage.removeItem('earhorn-listener')
      localStorage.setItem('earhorn-listener', JSON.stringify({
        type: 'announcement-request',
        script: script
      }))
    })
  }
  
  ////////////////////////////////////////////
  // Handle storage events (main listener). //
  ////////////////////////////////////////////

  function onStorage(evt) {

    switch(evt.key) {
      
      case 'earhorn-log':
      
        // Read the records
        var records = JSON.parse(evt.newValue)
        
        // Publish the records to anyone listening.
        logClient.$broadcast('main.logClient.logs', records)

        return
        
      case 'earhorn-listener':

        var record = JSON.parse(evt.newValue)
            
        if(record.type === 'edit') {
          logClient.$broadcast('main.logClient.edit', record)
          console.log('main.logClient.edit broadcast')
        }
        
        return
    }
  }
  
  //////////////////////////////////////
  // Manage storage event life cycle. //
  //////////////////////////////////////
  
  window.addEventListener('storage', onStorage, false)    
  
  logClient.$on('$destroy', function() {
    console.log('destroying')
    window.removeEventListener('storage', onStorage, false)
  })

  ////////////////
  // Edit code. //
  ////////////////

  logClient.edit = function(script, code) {

    if(!script)
      throw 'no script'

    localStorage.removeItem('earhorn-listener')
    localStorage.setItem('earhorn-listener', JSON.stringify({
      type: 'edit',
      script: script,
      body: code,
      reload: true
    }))
  }
 
  logClient.reset = function(scripts) {

    localStorage.removeItem('earhorn-listener')
    localStorage.setItem('earhorn-listener', JSON.stringify({
      type: 'reset',
      scripts: scripts,
      reload: true
    }))
  }

  logClient.refresh = function(script) {

    if(!script) throw 'no script'

    localStorage.removeItem('earhorn-listener')
    localStorage.setItem('earhorn-listener', JSON.stringify({
      type: 'refresh',
      script: script
    }))
  }
  
  ///////////////
  // All done. //
  ///////////////
  
  return logClient
}])
