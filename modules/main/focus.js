angular.module('main').directive('focus', [function() {  

  function link(scope, element, attr) {
    scope.$on(attr.focus, function() {
      element.focus()
    })
  }
  
  return { link: link }
}])
