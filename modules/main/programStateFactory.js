angular.module('main').factory('programStateFactory', [function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
    
  // Take a log object from the logClient and create a forwardable/reversible delta
  ProgramState.prototype.getDelta = function(log) {

    // Traverse code changes from announcements
    // Traverse code changes from pause points
    // Traverse var state change
  }
  
  ProgramState.prototype.change = function(change) {
    console.log(change)
  }
  
  ProgramState.prototype.forward = function(record) {

    if(!record.undo) {
      // Create a delta
    }
    
    this.change(record)
  }
  
  ProgramState.prototype.reverse = function(record) {
    this.change(record.undo)
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])