earhorn$('mouse.js', function() {var x, y

$(document).on('mousemove', function(evt) {
  
  evt
  
  if(Math.random() < 0.5)
    x = evt.clientX
  else
    y = evt.clientY
})

})()
