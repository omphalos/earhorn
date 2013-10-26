(function(root) {

  function LiveObject(key, defaults) {
    
    var json = localStorage.getItem(key)
      , self = this
      , record = json ? JSON.parse(json) : {}

    // Non-serialized properties
    Object.defineProperty(self, '_key', { value: key })
    Object.defineProperty(self, '_listeners', { value: [] })

    Object.keys(record).forEach(function(key) {
      self._defineProperty(key, record[key])
    })

    Object.keys(defaults || {}).forEach(function(key) {
      if(!self.hasOwnProperty(key))
        self._defineProperty(key, defaults[key])
    })
    
    if(!json) this._save()
    
    if(window.addEventListener)
      window.addEventListener('storage', self._onStorage, false)
    else if(window.attachEvent)
      window.attachEvent('onstorage', self._onStorage)
  }

  LiveObject.prototype._defineProperty = function(name, value) {
    Object.defineProperty(this, name, {
      enumerable: true,
      writeable: true,
      get: function() { return value },
      set: function(newValue) {
        if(newValue === value) return
        value = newValue
        this._save()
        this._emit('local')
      }
    })
  }

  LiveObject.prototype._save = function() {
    localStorage.setItem(this._key, JSON.stringify(this))
  }

  LiveObject.prototype._subscribe = function(listener) {
    this._listeners.push(listener)
  }

  LiveObject.prototype._unsubscribe = function(listener) {
    var index = this._listeners.indexOf(listener)
    if(index < 0) return
    this._listeners.splice(index, 1)
  }
  
  LiveObject.prototype._emit = function(evt) {
    this._listeners.forEach(function(listener) {
      listener(evt)
    })
  }

  LiveObject.prototype._onStorage = function(evt) {
    var self = this
    if(evt.key !== self._key) return
    var record = JSON.parse(evt)
    Object.keys(record).forEach(function(key) {
      if(self.hasOwnProperty(key))
        self[key] = record[key]
      else self._defineProperty(key, record[key])
    })
    this._emit('remote')
  }

  LiveObject.prototype._destroy = function() {
    if(window.removeEventListener)
      window.removeEventListener('storage', this._onStorage, false)
    else if(window.detachEvent)
      window.detachEvent('onstorage', this._onStorage)
  }

  root.LiveObject = LiveObject

})(this)


