angular.module('main').factory('programStateFactory', [
  function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
  
  ProgramState.prototype.announce = function(announcement) {

    this.scripts[announcement.script] = {
      body: announcement.body,
      modified: announcement.modified,
      parseError: announcement.parseError,
      logs: {}
    }
    
    if(!this.currentScript)
      this.currentScript = announcement.script
  }
  
  ProgramState.prototype.forward = function(record) {

    // console.log('forward', record)

    var self = this
    
    if(!record)
      throw 'invalid record'

    var target =
      self.scripts[record.script] &&
      self.scripts[record.script].logs[record.loc]
        
    record.reverse = record.reverse || {
      currentLoc: self.currentLoc,
      currentScript: self.currentScript,
      script: record.script, 
      loc: record.loc,      
      lostMessageCounts: target && target.lostMessageCounts,
      caught: target && target.caught,
      val: target && target.val
    }
    
    record.forward = record.forward || {
      loc: record.loc,
      val: record.val,
      currentLoc: record.loc,
      currentScript: record.script,
      lostMessageCounts: record.lostMessageCounts,
      script: record.script,
      caught: record.caught
    }
    
    this.applyChange(record.forward)
  }
  
  ProgramState.prototype.applyChange = function(change) {

    // console.log('applying change')
    
    if(!change) 
      throw 'invalid change'
    
    var self = this
    
    var changingScript = this.scripts[change.script]
    this.currentScript = change.currentScript
    this.currentLoc = change.currentLoc

    if(!changingScript)
      throw 'no changing script'
    
    if(change.val) {

      var changingLog = changingScript[change.loc]

      if(!changingLog) {

        // Add
        var split = change.loc.split(',')
          , from = { line: +split[0], column: +split[1] }
          , to = { line: +split[2], column: +split[3]}
          , parsed = { from: from, to: to }
          
        changingLog = changingScript.logs[change.loc] = { loc: parsed }
      }

      changingLog.val = change.val
      changingLog.caught = change.caught
      changingLog.lostMessageCounts = change.lostMessageCounts

    } else {
      
      // Delete log
      delete changingScript.logs[change.loc]
    }
    
    // console.log('logs after change', changingScript.logs)
  }
  
  ProgramState.prototype.reverse = function(record) {
    // console.log('reverse', record)
    this.applyChange(record.reverse)
  }
  
  ProgramState.prototype.clearLogs = function() {
    
    var self = this
    
    Object.keys(self.scripts).forEach(function(script) {

      var logs = self.scripts[script].logs
      
      Object.keys(logs).forEach(function(key) {
        delete logs[key]
      })
    })
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])