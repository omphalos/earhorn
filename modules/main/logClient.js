angular.module('main').factory('logClient', [function() {

  console.log('logClient')

  function onStorage(evt) {    
    console.log(evt)
  }

  function subscribe() {
    window.addEventListener('storage', onStorage, false)
  }
  
  function unsubscribe() {
    window.removeEventListener('storage', onStorage, false)
  }

  return {
    subscribe: subscribe,
    unsubscribe: unsubscribe
  }
}])
