#!/bin/bash

cat << EOF
<!doctype html>
<html>
    <head>
        <script id="sublimebookmarklet">

            function mainInitialized()
            {
                console.log("Loaded main");
                
                window.initializedSubOverlayBookmarklet = true;
                window.initializingSubOverlayBookmarklet = false;
                setTimeout(function() { subOverlayBookmarklet(); }, 0);
            }

            function initBookmarklet()
            {
                var s = document.createElement("script");
                
                s.src = "https://sub-lime.appspot.com/sublimelet.js";
                s.onload = mainInitialized;

                document.body.appendChild(s);
            }

            function subOverlayBookmarklet()
            {
                if (window.initializingSubOverlayBookmarklet)
                    return;

                if (!window.initializedSubOverlayBookmarklet)
                {
                    window.initializingSubOverlayBookmarklet = true;
                    initBookmarklet();
                    return;
                }

                SubLimeLet.run("https://sub-lime.appspot.com");
            }
        </script>
        <script>
            function run()
            {
                var elem = document.getElementById("sublimebookmarklet");
                var data = elem.innerHTML;

                data = "void((function() { " + data + "\nsubOverlayBookmarklet(); })())";

                elem = document.getElementById("bookmarkletlink");
                elem.setAttribute("href", "javascript:" + encodeURIComponent(data));
            }
        </script>
    </head>
    <body onload="run()">
EOF

markdown.py page.txt

cat << EOF

    </body>
</html>

EOF
