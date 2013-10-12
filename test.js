/////////////////
// Test script //
/////////////////

earhorn$(this, 'test-three.js', function() {

  var renderer = new THREE.CanvasRenderer()
  renderer.setSize(480, 480)
  document.body.appendChild(renderer.domElement)
    
  var aspect = window.innerWidth / window.innerHeight
    , camera = new THREE.PerspectiveCamera(75, aspect, 1, 1000)
  camera.position.z = 300
    
  var scene = new THREE.Scene()
    , geometry = new THREE.CubeGeometry(200, 200, 200)
    , materialOptions = { color: 'black', wireframe: true, wireframeLinewidth: 2 }
    , material = new THREE.MeshBasicMaterial(materialOptions)
    , mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)
  
  var counter = 0
  
  function animate() {
    
    // if(counter > 2) return;
    
    requestAnimationFrame(animate)
    
    counter = (counter + 1) % 1000
    
    var percent = counter * 0.001
      , radians = percent * Math.PI * 2
    
    mesh.rotation.x = Math.cos(radians)
    mesh.rotation.y = Math.sin(radians)
    
    renderer.render(scene, camera)
  }
    
  animate()
  
  // Example script derived from http://www.mrdoob.com/projects/htmleditor
  
   
  
  
  
  
  
  
  
  
  
  
  
})

