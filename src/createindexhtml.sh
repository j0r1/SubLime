#!/bin/bash

cat << EOF
<!doctype html>
<html>
    <head>
        <link rel="shortcut icon" href="/favicon.png" type="image/png">
	<meta property="og:image" content="https://sub-lime.appspot.com/icon-128x128.png" />
	<meta property="og:url" content="https://sub-lime.appspot.com/" />
	<meta property="og:description" content="Show subroutines synced to HTML5 video." />
	<meta property="og:site_name" content="SubLime" />
	<meta property="og:title" content="SubLime" />
	
	<meta itemprop="name" content="SubLime">
	<meta itemprop="description" content="Show subroutines synced to HTML5 video.">
	<meta itemprop="image" content="https://sub-lime.appspot.com/icon-128x128.png">

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
                
                s.src = "ORIGIN" + "/sublimelet.js";
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

                SubLimeLet.run("ORIGIN");
            }
        </script>
        <script>
            function run()
            {
                var elem = document.getElementById("sublimebookmarklet");
                var data = elem.innerHTML;

		data = data.replace(/ORIGIN/g, window.location.origin);
                data = "void((function() { " + data + "\nsubOverlayBookmarklet(); })())";

                elem = document.getElementById("bookmarkletlink");
                elem.setAttribute("href", "javascript:" + encodeURIComponent(data));
            }
        </script>
	<style>
	    #sublimelogo {
	        float: right;
	        margin: 0px 0px 0px 20px;
            }
	</style>
    </head>
    <body onload="run()">
	<script>
	(function(d, s, id) {
	  var js, fjs = d.getElementsByTagName(s)[0];
	  if (d.getElementById(id)) return;
	  js = d.createElement(s); js.id = id;
	  js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.0";
	  fjs.parentNode.insertBefore(js, fjs);
	}(document, 'script', 'facebook-jssdk'));
	</script>

	<div id="sublimelogo">
		<img src="icon-128x128.png"><br>
		<div class="g-plusone" data-size="medium" data-href="https://sub-lime.appspot.com/"></div><br>
		<div class="fb-like" data-href="https://sub-lime.appspot.com/" data-layout="button_count" data-action="like" data-show-faces="true" data-share="false"></div><br>
	</div>

EOF

markdown.py page.txt

cat << EOF

	<!-- Place this tag after the last +1 button tag. -->
	<script type="text/javascript">
	  (function() {
	    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
	    po.src = 'https://apis.google.com/js/platform.js';
	    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
	  })();
	</script>
    </body>
</html>

EOF
