/////////////////
// Test script //
/////////////////

earhorn$(this, 'phoria.js', function() {

  var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame || 
    function(c) { window.setTimeout(c, 15) }

   var canvas = document.getElementById('canvas');
   
   var scene = new Phoria.Scene();
   scene.camera.position = {x:0.0, y:2.0, z:-6.0};
   scene.perspective.aspect = canvas.width / canvas.height;
   scene.viewport.width = canvas.width;
   scene.viewport.height = canvas.height;
   
   var renderer = new Phoria.CanvasRenderer(canvas);
   
   var c = Phoria.Util.generateUnitCube();
   var cube = Phoria.Entity.create({
      points: c.points,
      edges: c.edges,
      polygons: c.polygons,
      style: {
        color: [0, 0, 0],
        linewidth: 3,
        drawmode: 'wireframe'
      }
   });
   scene.graph.push(cube);
   scene.graph.push(new Phoria.DistantLight());

   function animate() {

     cube.rotateY(0.01);
     
     // Phoria uses this matrix of elements to render the cube
     cube.matrix[0]
     cube.matrix[1]
     cube.matrix[2]     

     scene.modelView();
     renderer.render(scene);

     requestAnimationFrame(animate);
   }
      
   requestAnimationFrame(animate);
})

