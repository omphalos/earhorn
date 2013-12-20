angular.module('main').directive('editor', [
  'consoleInterface',
  '$parse', 
  '$templateCache', 
  '$compile', 
  '$interval',
  'settingsService', function(
  consoleInterface,
  $parse,
  $templateCache,
  $compile,
  $interval,
  settingsService) {  

  function link(scope, element, attr) {      

    var settings = settingsService.load({
      editor: { maxOperations: 10 }
    })

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

    var pending = {}
      , template = $compile($templateCache.get(attr.widgetTemplate))
      , widgetElement = template(scope)[0]
      , widgetObj
      , markers = {}
      , lineWidgets = {}     
      , bookmarks = {}

    var rebuildEditor = function() {
      
      // Focus.
      if(pending.focus) {
        var focus = scope.$eval(attr.focus)
        if(focus) editor.focus()
      }
      
      // Code.
      if(pending.code) {
        var code = scope.$eval(attr.code) || ''
        if(code !== editor.getValue())
          editor.setValue(code)        
      }
      
      // Cursor.
      var oldCursor = editor.getCursor()
        , line = pending.line ? scope.$eval(attr.line) : oldCursor.line
        , ch = pending.ch ? scope.$eval(attr.ch) : oldCursor.ch
        
      if(line !== oldCursor.line || ch !== oldCursor.ch) {
        editor.scrollTo(0)
        editor.setCursor({ line: line, ch: ch })
      }
      
      // Widget.
      if(pending.widget) {
  
        if(widgetObj) widgetObj.clear() // TODO check this

        var line = scope.$eval(attr.widgetLine) || 0
          , ch = scope.$eval(attr.widgetCh) || 0
          , pos = { line: line, ch: ch }

        widgetObj = editor.addWidget(pos, widgetElement)
      }
      
      // Markers.
      if(pending.markers) {
      
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
      }
      
      // Line widgets.
      if(pending.lineWidgets) {

        var newLineWidgets = scope.$eval(attr.lineWidgets) || {}
        
        Object.keys(lineWidgets).forEach(function(key) {

          if(newLineWidgets.hasOwnProperty(key)) return
          
          // Delete line widget.
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
            
          lineWidgets[key] = {
            scope: lineWidgetScope,
            widget: editor.addLineWidget(
              lineWidget.line,
              template(lineWidgetScope)[0],
              lineWidget.options)
          }
        })
      }
      
      // Bookmarks.
      if(pending.bookmarks) {

        var viewport = editor.getViewport()
          , newBookmarks = scope.$eval(attr.bookmarks) || {}
          , operations = 0

        for(var key in bookmarks) {

          var isInNewBookmarks = newBookmarks.hasOwnProperty(key)
            , bookmark = bookmarks[key]
            , loc = bookmark.scope.model.loc
            , isAbove = loc.to.line <= viewport.to
            , isBelow = loc.to.line >= viewport.from
            , isInViewport = isAbove && isBelow

          if(isInNewBookmarks && isInViewport) continue
          
          // Delete bookmark.
          bookmark.destroy()
        }

        for(var key in newBookmarks) {
          
          var existingBookmark = bookmarks[key]

          if(existingBookmark) {
                
            // Update bookark.
            bookmarks[key].scope.model = newBookmarks[key]
            
          } else {

            var log = newBookmarks[key]
            if(
              log.loc.to.line <= viewport.to &&
              log.loc.to.line >= viewport.from) {
                
              // Add bookmark.
              var bookmarkScope = scope.$new()
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
                  delete bookmarks[this.scope.key];
                  this.scope.$destroy()
                  this.bookmark.clear() // TODO rename bookmark to textMarker (?)
                }
              }
                  
              if(operations++ > settings.editor.maxOperations) {
                pending = { bookmarks: true }
                rebuildEditorDebounced()
                return 
              }
            } /* else {
              console.log('not adding out of viewport', key)
            }*/
          }
        }
      }
      
      pending = {}
    }

    var rebuildEditorOperator = function() {
      editor.operation(rebuildEditor)
    }    
    var rebuildEditorDebounced = _.debounce(rebuildEditor, 25)

    function watch(prop, uiComponent, fullWatch) {
      scope.$watch(prop, function(newValue, oldValue) {
        if(newValue === oldValue) return
        pending[uiComponent] = true
        rebuildEditorDebounced()
      }, fullWatch)
    } 
    
    // Bind focus.     
    if(attr.focus) {

      // TODO: make this an event instead
      editor.on('focus', function() {
        $parse(attr.focus).assign(scope, true)
        if(!scope.$$phase) scope.$digest()
      })
      
      editor.on('blur', function() {
        $parse(attr.focus).assign(scope, false)
        if(!scope.$$phase) scope.$digest()
      })
      
      watch(attr.focus, 'focus')
    }
    
    // Bind code.        
    if(attr.code) {

      editor.on('change', function() {
        scope[attr.code] = editor.getValue()
        if(!scope.$$phase) scope.$digest()
      })

      watch(attr.code, 'code')  
    }
    
    // Bind cursor.
    editor.on('cursorActivity', function() {
      var cursor = editor.getCursor()
      if(attr.line)
        $parse(attr.line).assign(scope, cursor.line)
      if(attr.ch)
        $parse(attr.ch).assign(scope, cursor.ch)
      if(!scope.$$phase) scope.$digest()
    })
    
    if(attr.line) watch(attr.line, 'line')
    if(attr.ch) watch(attr.ch, 'ch')

    // Bind widget.
    if(attr.widgetTemplate) {
      watch(attr.widgetLine, 'widget')
      watch(attr.widgetCh, 'widget')
    }

    // Bind markers.
    if(attr.markers)
      watch(attr.markers, 'markers', true)

    // Bind line widgets.    
    if(attr.lineWidgets)
      watch(attr.lineWidgets, 'lineWidgets', true)
      
    // Bind bookmarks.
    if(attr.bookmarks) {
      
      editor.on('viewportChange', function() {
        pending.bookmarks = true
        rebuildEditorDebounced()
      })
      
      watch(attr.bookmarks, 'bookmarks', true)
    }
  }
  
  return { restrict: 'E', link: link }
}])
