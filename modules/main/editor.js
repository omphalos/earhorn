angular.module('main').directive('editor', [
  'consoleInterface',
  '$parse', 
  '$templateCache', 
  '$compile', function(
  consoleInterface,
  $parse,
  $templateCache,
  $compile) {  

  function link(scope, element, attr) {      

    ////////////////////////////////////////////
    // Create the CodeMirror editor instance. //
    ////////////////////////////////////////////

    var initOptions = { value: scope.$eval(attr.code) || '' }
    Object.keys(attr).forEach(function(attribute) {
      if(attribute.slice(0, 4) !== 'init') return
      var key = attribute[4].toLowerCase() + attribute.slice(5)
      initOptions[key] = attr[attribute]
    })
    
    var editor = CodeMirror(element[0], initOptions)
    
    if(attr.hasOwnProperty('element'))
      $parse(attr.element).assign(scope, editor)
    
    ///////////////////////////////
    // Two-way binding for code. //
    ///////////////////////////////
    
    var lastReadCodeValue

    scope.$watch(attr.code, function(newValue, oldValue) {
      if(newValue === oldValue || newValue === lastReadCodeValue) return
      // console.log('code change', newValue, oldValue)
      editor.setValue(newValue || '')
    })

    editor.on('change', _.debounce(function() {
      scope.$apply(function() {
        lastReadCodeValue = scope[attr.code] = editor.getValue()
      })
    }, 100))

    /////////////////////////////////
    // Two-way binding for cursor. //
    /////////////////////////////////

    if(attr.hasOwnProperty('line'))
      scope.$watch(attr.line, function(newValue, oldValue) {
        if(newValue === editor.getCursor().line) return
        editor.setCursor({
          line: scope.$eval(attr.line) || 0,
          ch: editor.getCursor().ch 
        })
      })

    if(attr.hasOwnProperty('ch'))
      scope.$watch(attr.ch, function(newValue, oldValue) {
        if(newValue === editor.getCursor().ch) return
        editor.setCursor({
          line: editor.getCursor().line,
          ch: scope.$eval(attr.ch) || 0
        })
      })
      
    editor.on('cursorActivity', _.debounce(function() {
      var cursor = editor.getCursor()
      scope.$apply(function() {
        if(attr.hasOwnProperty('line'))
          $parse(attr.line).assign(scope, cursor.line)
        if(attr.hasOwnProperty('ch'))
          $parse(attr.ch).assign(scope, cursor.ch)
      })
    }, 100))

    /////////////////////////////////////
    // Two-way binding for the widget. //
    /////////////////////////////////////
    
    if(attr.hasOwnProperty('widgetTemplate')) {

      var template = $compile($templateCache.get(attr.widgetTemplate))
        , widgetElement = template(scope)[0]
        , widgetObj

      function updateWidget() {

        if(widgetObj) widgetObj.clear() // TODO check this

        var line = scope.$eval(attr.widgetLine) || 0
          , ch = scope.$eval(attr.widgetCh) || 0
          , pos = { line: line, ch: ch }

        widgetObj = editor.addWidget(pos, widgetElement)
      }
      
      scope.$watch(attr.widgetLine, updateWidget)
      scope.$watch(attr.widgetCh, updateWidget)
    }

    //////////////////////////////////
    // Two-way binding for markers. //
    //////////////////////////////////
    
    if(attr.hasOwnProperty('markers')) {
      
      var markers = {}
      
      scope.$watch(attr.markers, function(newValue, oldValue) {
        
        var newMarkers = scope.$eval(attr.markers) || {}
        
        Object.keys(markers).forEach(function(key) {

          if(newMarkers.hasOwnProperty(key)) return
          
          // Delete marker.
          markers[key].clear()
          delete markers[key]          
        })
        
        Object.keys(newMarkers).forEach(function(key) {
          
          if(markers.hasOwnProperty(key)) return
          
          // Add marker.
          var marker = newMarkers[key]
          markers[key] = editor.markText(
            marker.from, 
            marker.to, 
            marker.options)
        })
      }, true)
    }

    ////////////////////////////////////
    // Two-way binding for bookmarks. //
    ////////////////////////////////////
    
    if(attr.hasOwnProperty('bookmarks')) {
      
      var bookmarks = {}

      scope.$watch(attr.bookmarks, function(newValue, oldValue) {

        var newBookmarks = scope.$eval(attr.bookmarks) || {}

        Object.keys(bookmarks).forEach(function(key) {

          if(newBookmarks.hasOwnProperty(key)) return

          // Delete widget.
          var bookmark = bookmarks[key]
          bookmark.bookmark.clear() // TODO rename widget to textMarker
          bookmark.scope.$destroy()
          delete bookmarks[key]
        })
        
        Object.keys(newBookmarks).forEach(function(key) {

          if(bookmarks.hasOwnProperty(key)) {
            
            // Update
            bookmarks[key].scope.log = newBookmarks[key]
            
          } else {

            // Add widget.
            var bookmarkScope = scope.$new()
              , log = newBookmarks[key]
              , pos = { line: log.loc.to.line, ch: log.loc.to.column }
              , template = $compile($templateCache.get(attr.bookmarkTemplate))
              , widget = template(bookmarkScope)[0]
              , options = angular.extend({ widget: widget, insertLeft: 1 }, log)
  
            bookmarkScope.log = log
            bookmarkScope.key = key
  
            bookmarks[key] = {
              scope: bookmarkScope,
              bookmark: editor.setBookmark(pos, options),
              widget: widget
            }
          }
        })
      }, true)
    }
  }
  
  return { restrict: 'E', link: link }
}])
