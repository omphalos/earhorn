/////////////////
// Test script //
/////////////////

earhorn$('test.js', function() {

  function square(val) {
    return val * val
  }
  
  function Person() {
    this.name = 'john smith'
  }

  var s = new Person()
  s
      
  var counter = { count: 0 }
  
  var str = 'hello world'
  str

  $(document).on('mousemove', function(evt) {
    var x = evt.clientX
      , y = evt.clientY
    counter.count++    
    x, y, counter
  })
  
  var a = 2
    , bb = 3
    , ccc = 4
    
  a, bb, ccc})
