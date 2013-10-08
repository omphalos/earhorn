/////////////////
// Test script //
/////////////////

earhorn$(this, 'test.js', function() {
  
  var renderer = new THREE.CanvasRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
    
  var aspect = window.innerWidth / window.innerHeight
    , camera = new THREE.PerspectiveCamera(75, aspect, 1, 1000)
  camera.position.z = 500
    
  var scene = new THREE.Scene()
    , geometry = new THREE.CubeGeometry(200, 200, 200)
    , materialOptions = { color: 0x000000, wireframe: true, wireframeLinewidth: 2 }
    , material = new THREE.MeshBasicMaterial(materialOptions)
    , mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)
  
  var counter = 0
  function animate() {
    
    requestAnimationFrame(animate)
    
    counter = (counter + 1) % 100
    var percent = counter * 0.01
      , radians = percent * Math.PI * 2
    
    mesh.rotation.x = Math.cos(radians)
    mesh.rotation.y = Math.sin(radians)
    
    renderer.render(scene, camera)
  }
  
  animate()
})
