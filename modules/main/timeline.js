angular.module('main').factory('timeline', [
  '$rootScope',
  'logClient',
  'programStateFactory',
  'settingsService', function(
  $rootScope,
  logClient,
  programStateFactory,
  settingsService) {

  'use strict'

  /////////////////
  // Initialize. //
  /////////////////

  var timeline = $rootScope.$new()  
    , handlers = {}
    , playing = true
    , settings = settingsService.load({ maxHistoryLenth: 100 })
    , lostMessageCounts = {}

  timeline.scriptContents = {}
  timeline.history = []
  timeline.position = 0
  timeline.programState = programStateFactory.create()
  
  ///////////////////////
  // Player interface. //
  ///////////////////////
  
  function getEndPosition() {
    return Math.max(timeline.history.length - 1, 0)
  }
  
  timeline.$watch('position', function(newVal, oldVal) {

    for(var i = oldVal; i < newVal && i < timeline.history.length; i++)
      programState.forward(history[i])
    
    for(var i = oldVal; i > newVal && i >= 0; i--)
      programState.reverse(history[i])
      
    if(newVal !== getEndPosition())
      timeline.pause()
  })

  timeline.play = function() {
    position = getEndPosition()
    // if(postponedAnnouncements) // TODO
    playing = true
  }

  timeline.pause = function() {
    playing = false
  }
  
  timeline.step = function(stepSize) {
    timeline.pause()
    position += stepSize
  }
  
  timeline.stepForward = function() { 
    timeline.step(1) 
  } 
  
  timeline.stepBackward = function() { 
    timeline.step(-1) 
  }
  
  timeline.fastForward = function() {
    timeline.step(Math.min(timeline.history.length, 1) - position - 1)
  }

  timeline.fastBackward = function() {
    timeline.step(-position)
  }

  /////////////////////
  // Route messages. //
  /////////////////////

  var pendingAnnouncements = null

  logClient.$on('main.logClient', function(evt, records) {

    var missingScripts = {} // Scripts whose contents haven't been received.

    records.forEach(function(record) {
      handlers[record.type](record, missingScripts)
    })
    
    // If we are receiving logs for scripts we haven't received yet,
    // let's request them now.  Let's run the request here to coalesce the 
    // messages and cause less traffic between the timeline and logClient.
    logClient.requestScripts(Object.keys(missingScripts))
  })
  
  ///////////////////////////
  // Handle announcements. //
  ///////////////////////////
  
  handlers.announcement = function(record) {
    pendingAnnouncements = pendingAnnouncements || {}
    pendingAnnouncements[record.script] = record.body
    timeline.scriptContents[record.script] = record.body
  }
  
  //////////////////
  // Handle logs. //
  //////////////////
  
  handlers.log = function(record, missingScripts) {

    // If we don't have the script associated with the log,
    // we can't really do anything.  We just note that the
    // script is missing and return.
    if(!timeline.scriptContents[record.script]) {
      missingScripts[record.script] = null
      return
    }
    
    // We need to drop messages if we're paused and if adding the
    // message would exceed the maximum history capacity.
    // Otherwise, information that's important to the user could
    // be pushed out of the timeline.
    if(!playing && timeline.length >= settings.maxHistoryLenth - 1) {
      lostMessageCounts[record.script] = lostMessageCounts[record.script] || 0
      lostMessageCounts[record.script]++
      return
    }

    // Add any pending announcements to this record, publishing them together.
    if(pendingAnnouncements) {
      record.annoucements = pendingAnnouncements
      record.lostMessageCounts = lostMessageCounts
      pendingAnnouncements = null
      lostMessageCounts = {}
    }
    
    // Add the record to the history.
    timeline.history.push(record)

    if(playing) {
     
      // If we're playing, we need to update the state for every new record.
      timeline.programState.forward(record)

      // Max sure history doesn't overflow its capacity.
      if(timeline.history.length >= settings.maxHistoryLength)
        timeline.shift()
    }
  }
  
  return timeline

}])