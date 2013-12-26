earhorn
=======

JavaScript execution logs.

![earhorn](https://raw.github.com/omphalos/earhorn/master/logo.jpg)

Demo
====

Check out the [demo](http://omphalos.github.io/earhorn/index.html?iframe=mouse-iframe-demo.html).

Use on your code
================

It's possible to use earhorn outside of a sandbox, on your code, after following a basic set up.

Step 1
------

Add earhorn to your website.  An easy way:

    git clone https://github.com/omphalos/earhorn --depth 1

Step 2
------

Add a reference to earhorn.js to your page.

    <script src="/earhorn/earhorn.js"></script>

Step 3
------

Wrap your code with a call to earhorn$.

For example, to instrument this code:

    var x = 3
      , y = 4
      , sum = x + y

Wrap it with a call to earhorn$:

    earhorn$('some label for my script', function() {

      var x = 3
        , y = 4
        , sum = x + y

    })()

The call to earhorn$ just returns an instrumented version of what you pass to it.  In this case, the extra parens invoke the instrumented function, but you could also just pass the function reference around if you wanted.

Step 4
------

Navigate to /earhorn/index.html.  Then open the web page hosting your JavaScript in a separate tab.

License
=======

MIT
