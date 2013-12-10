angular.module('main').directive('editor', [
  'consoleInterface',
  '$parse', 
  '$templateCache', 
  '$compile', 
  '$interval', function(
  consoleInterface,
  $parse,
  $templateCache,
  $compile,
  $interval) {  

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
      
    ////////////////////////////
    // Listen to focus event. //
    ////////////////////////////

    if(attr.hasOwnProperty('focus')) {
      
      $interval(function() {
        var focus = editor.hasFocus()
        if(focus !== editor.hasFocus()) {
          $parse(attr.focus).assign(scope, focus)
          if(!scope.$$phase) scope.$digest()
        }
      }, 100)
      
      scope.$watch(attr.focus, function(newVal, oldVal) {
        if(newVal) editor.focus()
      })
    }
    
    ///////////////////////////////
    // Two-way binding for code. //
    ///////////////////////////////
    
    var lastReadCodeValue

    scope.$watch(attr.code, _.debounce(function(newValue, oldValue) {
      if(newValue === oldValue || newValue === lastReadCodeValue) return
      // console.log('code change', newValue, oldValue)
      lastReadCodeValue = newValue || ''
      editor.setValue(lastReadCodeValue)
    }, 100))

    editor.on('change', _.debounce(function() {
      scope.$apply(function() {
        lastReadCodeValue = scope[attr.code] = editor.getValue()
      })
    }, 100))

    /////////////////////////////////
    // Two-way binding for cursor. //
    /////////////////////////////////

    if(attr.hasOwnProperty('line'))
      scope.$watch(attr.line, _.debounce(function(newValue, oldValue) {
        if(newValue === editor.getCursor().line) return
        editor.scrollTo(0)
        editor.setCursor({
          line: scope.$eval(attr.line) || 0,
          ch: editor.getCursor().ch 
        })
      }, 100))

    if(attr.hasOwnProperty('ch'))
      scope.$watch(attr.ch, function(newValue, oldValue) {
        if(newValue === editor.getCursor().ch) return
        editor.scrollTo(0)
        editor.setCursor({
          line: editor.getCursor().line,
          ch: scope.$eval(attr.ch) || 0
        })
      })
      
    editor.on('cursorActivity', function() {
      var cursor = editor.getCursor()
      if(attr.hasOwnProperty('line'))
        $parse(attr.line).assign(scope, cursor.line)
      if(attr.hasOwnProperty('ch'))
        $parse(attr.ch).assign(scope, cursor.ch)
      if(!scope.$$phase) scope.$digest()
    })

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

    ///////////////////////////////////////
    // Two-way binding for line widgets. //
    ///////////////////////////////////////
    
    if(attr.hasOwnProperty('lineWidgets')) {
      
      var lineWidgets = {}
      
      scope.$watch(attr.lineWidgets, function(newValue, oldValue) {
        
        var newLineWidgets = scope.$eval(attr.lineWidgets) || {}
        
        Object.keys(lineWidgets).forEach(function(key) {

          if(newLineWidgets.hasOwnProperty(key)) return
          
          // Delete line widget.
          console.log('deleting widget')
          lineWidgets[key].widget.clear()
          lineWidgets[key].scope.$destroy()
          delete lineWidgets[key]          
        })
        
        Object.keys(newLineWidgets).forEach(function(key) {
          
          if(lineWidgets.hasOwnProperty(key)) return
          
          // Add line widget.
          var lineWidget = newLineWidgets[key]
            , template = $compile($templateCache.get(lineWidget.template))
            , lineWidgetScope = scope.$new()
            
          lineWidgetScope.model = lineWidget.model
            
          console.log('adding widget')
          lineWidgets[key] = {
            scope: lineWidgetScope,
            widget: editor.addLineWidget(
              lineWidget.line,
              template(lineWidgetScope)[0],
              lineWidget.options)
          }
          
        })
      }, true)
    }

    ////////////////////////////////////
    // Two-way binding for bookmarks. //
    ////////////////////////////////////
    
    if(attr.hasOwnProperty('bookmarks')) {
      
      var bookmarks = {}

      scope.$watch(attr.bookmarks, _.debounce(function(newValue, oldValue) {

        editor.operation(function() {

          var newBookmarks = scope.$eval(attr.bookmarks) || {}
  
          Object.keys(bookmarks).forEach(function(key) {
  
            if(newBookmarks.hasOwnProperty(key)) return
            
            // Delete bookmark.
            bookmarks[key].destroy()
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
    
              bookmarkScope.model = log
              bookmarkScope.key = key
    
              bookmarks[key] = {
                scope: bookmarkScope,
                bookmark: editor.setBookmark(pos, options),
                widget: widget,
                destroy: function() {
                  this.bookmark.clear() // TODO rename bookmark to textMarker (?)
                  this.scope.$destroy()
                  delete bookmarks[key]
                }
              }
            }
          })
        })
      }, 100), true)
    }
  }
  
  return { restrict: 'E', link: link }
}])
