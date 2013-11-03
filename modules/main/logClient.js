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
    
    if(evt.key !== 'earhorn-log')
      return

    // Read the records
    var records = JSON.parse(evt.newValue)
    
    // Publish the records to anyone listening.
    logClient.$broadcast('main.logClient', records)
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
