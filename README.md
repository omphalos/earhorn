earhorn
=======

JavaScript execution logs.

![earhorn](https://raw.github.com/omphalos/earhorn/master/logo.jpg)

Demo
====

Check out the [demo](http://omphalos.github.io/earhorn/index.html?iframe=mouse-iframe-demo.html).

Use on a real project
=====================

It's possible to use earhorn outside of a sandbox, on actual code, although theres a few set up steps required to do so.

First add earhorn to your website.  An easy way:

    git clone https://github.com/omphalos/earhorn --depth 1

Add a reference to esprima.js and earhorn.js to your page.  (A bundled version is coming soon.)

Let's say you have a JavaScript file you want to instrument, and it looks like this:

    var x = 3
      , y = 4
      , sum = x + y

    console.log(sum)

Just wrap it in a call to earhorn:

    earhorn('my console log', function() {

      var x = 3
        , y = 4
        , sum = x + y

      console.log(sum)

    })()

Navigagte to /earhorn/index.html.  Open your the html hosting your JavaScript in a separate tab.  Alteratively, you can tell earhorn to open your page in an iframe by appending #/iframe=your-iframe-url to /earhorn/index.html.

Related Links
=============

TODO

License
=======

MIT
