angular.module('main').factory('settingsService', [
  '$rootScope', 
  '$parse', function(
  $rootScope,
  $parse) {

  // Create settings object.
  var settings = JSON.parse(localStorage.getItem('earhorn-settings') || '{}')
    , allDefaults = []

  // Apply changes from other windows.
  function onStorage(evt) {
    if(evt.key !== 'earhorn-settings') return
    settings = JSON.parse(evt.newValue || '{}')
    applyDefaults()
    if(!$rootScope.$$phase) $rootScope.$digest()
  }
  
  // Manage event life-cycle.
  window.addEventListener('storage', onStorage, false)

  $rootScope.$on('$destroy', function() {
    window.removeEventListener('storage', onStorage, false)
  })

  function applyDefaults() {

    allDefaults.forEach(function(defaults) {
      Object.keys(defaults).forEach(function(key) {
        if(settings.hasOwnProperty(key)) return
        settings[key] = defaults[key]
      })
    })
    
    if(!settings.save)
      Object.defineProperty(settings, 'save', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function() { 
          localStorage.setItem('earhorn-settings', JSON.stringify(settings))
          console.log('settings saved')
        }
      })
      
    if(!settings.reset)
      Object.defineProperty(settings, 'reset', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function() { 
          localStorage.removeItem('earhorn-settings')
          location.reload(true)
        }
      })
  }

  // Get reference to settings, applying defaults.
  function load(defaults) {

    if(defaults) allDefaults.push(defaults)
    applyDefaults()
    return settings
  }

  // Save changes in $scope to localStorage.
  function $watch($scope, pathInScope) {

    // Persist changes to localStorage.
    $scope.$watch(pathInScope, function(newVal, oldVal) {
      if(newVal === oldVal) return
      settings.save()
    }, true)
  }
  
  // Get reference to settings and save changes to localStorage.
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