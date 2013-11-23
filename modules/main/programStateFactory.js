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

    var self = this
    
    if(!record)
      throw 'invalid record'

    record.reverse = record.reverse || {
      currentLoc: self.currentLoc,
      currentScript: self.currentScript,
      script: record.script,
      loc: record.loc,
      val: // Get the previous value.
        self.scripts[record.script] &&
        self.scripts[record.script].logs[record.loc] &&
        self.scripts[record.script].logs[record.loc].val
    }
    
    record.forward = record.forward || {
      loc: record.loc,
      val: record.val,
      currentLoc: record.loc,
      currentScript: record.script,
      script: record.script
    }
    
    this.applyChange(record.forward)
  }
  
  ProgramState.prototype.applyChange = function(change) {
    
    if(!change) 
      throw 'invalid change'
    
    var self = this
    
    var changingScript = this.scripts[change.script]
    this.currentScript = change.currentScript
    this.currentLoc = change.currentLoc

    if(!changingScript)
      return console.log('no changing script')
    
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

    } else {
      
      // Delete log
      delete changingScript.logs[change.loc]
    }
  }
  
  ProgramState.prototype.reverse = function(record) {
    this.applyChange(record.reverse)
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])