angular.module('main').factory('settingsService', [
  '$rootScope', 
  '$parse', function(
  $rootScope,
  $parse) {

  // Create settings object.
  var settings = JSON.parse(localStorage.getItem('earhorn-settings') || '{}')

  // Apply changes from other windows.
  function onStorage(evt) {
    if(evt.key !== 'earhorn-settings') return
    $scope.$apply(function() {
      angular.copy(JSON.parse(evt.newValue), settings)
    })      
      }
  
  // Manage event life-cycle.
  window.addEventListener('storage', onStorage, false)

  $rootScope.$on('$destroy', function() {
    window.removeEventListener('storage', onStorage, false)
  })

  function load(defaults) {

    defaults = defaults || {}
    
    Object.keys(defaults).forEach(function(key) {
      if(!settings.hasOwnProperty(key))
        settings[key] = defaults[key]
    })
    
    return settings
  }

  function $watch($scope, pathInScope) {
  
    // Persist changes to localStorage.
    $scope.$watch(pathInScope, function(newVal, oldVal) {
      if(newVal === oldVal) return
      localStorage.setItem('earhorn-settings', JSON.stringify(newVal))
    }, true)
  }
  
  function loadAnd$watch($scope, pathInScope, defaults) {
    $parse(pathInScope).assign($scope, load(defaults))
    $watch($scope, pathInScope)
  }

  return {
    load: load,
    $watch: $watch,
    loadAnd$watch: loadAnd$watch
  }
}])