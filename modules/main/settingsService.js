angular.module('main').factory('settingsService', [function() {

  console.log('settingsService')

  function attach($scope, pathInScope, localStorageKey, defaults) {

    // Create settings object.
    var settings = $scope[pathInScope] =
      JSON.parse(localStorage.getItem(localStorageKey) || '{}')

    // Set defaults.
    Object.keys(defaults).forEach(function(key) {
      if(!settings.hasOwnProperty(key))
        settings[key] = defaults[key]
    })
  
    // Persist changes to localStorage.
    $scope.$watch(pathInScope, function(newVal, oldVal) {
      if(newVal === oldVal) return
      localStorage.setItem(localStorageKey, JSON.stringify(newVal))
    }, true)

    // Apply changes from other windows.
    function onStorage(evt) {
      if(evt.key !== localStorageKey) return
      $scope.$apply(function() {
        angular.copy(JSON.parse(evt.newValue), settings)
      })      
    }

    // Manage event life-cycle.
    window.addEventListener('storage', onStorage, false)

    $scope.$on('$destroy', function() {
      window.removeEventListener('storage', onStorage, false)
    })
  }

  return { attach: attach  }
}])