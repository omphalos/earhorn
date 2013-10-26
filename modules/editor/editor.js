angular.module('editor', [])
angular.module('editor').directive('editor', [function() {  

  function link(scope, element, attr) {      
    console.log('editor')
    CodeMirror(element[0], attr)
  }

  return { restrict: 'E', link: link }
}])
