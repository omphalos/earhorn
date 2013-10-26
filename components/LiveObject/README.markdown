LiveObject
==========

LiveObject is an implementation of localStorage-backed objects that auto sync, so you can focus on your model not your storage.

Example:
========

    var foo = new LiveObject('some-unique-key', {"name":"some name"})   
    localStorage.getItem('some-unique-key') // Returns {"name":"some name"}
  
    foo.name = "new name"
    localStorage.getItem('some-unique-key') // Returns {"name":"new name"}

Usage
=====

    new LiveObject(uniqueKey, defaults)
  
Where uniqueKey is a key uniquely identifying your object to localStorage and defaults lists the properties your object should have.

Auto-sync
=========
  
Objects with the same key will sync their values across windows.  Open two windows, and type into both:

    var foo = new LiveObject('some-unique-key', {"name":"some name"})

Then in one window, type:

    foo.name = "new name"

In the second window foo.name will be "new name" as well.

Subscriptions
=============

You also can subscribe to changes in your object.

    var foo = new LiveObject('test', { age: 99 })
    foo._subscribe(function() { console.log('boink') })
    foo.age = 100 // Prints boink

Compatibility
=============

This uses localStorage and ES5 magic.  Expect this to work in IE9+/Chrome/Safari/Firefox.





