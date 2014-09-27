maincode = function()
{
    var initialized = false;
    var initializing = false;
    var video = null;

    var onCheckSubtitleTimeout = function()
    {
        if (!video)
            return;

        var currentTime = video.currentTime;
        console.log(currentTime);
    }

    var openSRTFile = function()
    {

    }

    var resourcesInitialized = function(_this)
    {
        console.log("Resources initialized");
        
//        var s = document.createElement("style");
//        s.innerHTML = ".vex.vex-theme-wireframe .vex-content { width: 90%; }";
//        document.head.appendChild(s);

        vex.defaultOptions.className = 'vex-theme-wireframe';
//        vex.defaultOptions.className = 'vex-theme-top';
        
        initializing = false;
        initialized = true;

        setTimeout(function() { _this.run(); }, 0);

        var oldKbdFunction = document.onkeyup;
        document.onkeyup = function(evt)
        {
            if (oldKbdFunction)
                oldKbdFunction(evt);

            console.log("KeyCode = " + evt.keyCode);
            if (evt.keyCode == 79) 'o'
                openSRTFile();
        }
        
        setInterval(function() { onCheckSubtitleTimeout(); }, 200);
    }

    var init = function(_this)
    {
        var resources = [ 
                        { type: "script", url: "https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js" },
                        { type: "script", contents: "var jQuery_2_1_0_for_vex = jQuery.noConflict(true);", url: "internal" },
                        //{ type: "link", url: "http://github.hubspot.com/vex/css/vex.css" },
                        //{ type: "link", url: "http://github.hubspot.com/vex/css/vex-theme-wireframe.css" },
                        //{ type: "script", url: "http://github.hubspot.com/vex/js/vex.js" },
                        //{ type: "script", url: "http://github.hubspot.com/vex/js/vex.dialog.js" },
                        { type: "link", url: "http://localhost:8080/vex.css" },
                        { type: "link", url: "http://localhost:8080/vex-theme-wireframe.css" },
                        //{ type: "link", url: "https://web-sight.appspot.com/vex-theme-top.css" },
                        { type: "script", url: "http://localhost:8080/vex.js" },
                        { type: "script", url: "http://localhost:8080/vex.dialog.js" },
                        //{ type: "script", url: "https://github.com/niklasvh/html2canvas/releases/download/0.4.1/html2canvas.js" },
                        //{ type: "script", url: "http://crypto-js.googlecode.com/svn/tags/3.1.2/src/core.js" },
                        //{ type: "script", url: "http://crypto-js.googlecode.com/svn/tags/3.1.2/src/md5.js" },
                      ]

        function createLoadCallback(idx)
        {
            return function()
            {
                console.log(resources[idx].url + " loaded");

                if (idx+1 == resources.length)
                    resourcesInitialized(_this);
                else
                {
                    processResource(idx+1);
                }
            }
        }

        function processResource(idx)
        {
            var obj = resources[idx];

            if (obj.type == "link")
            {
                var s = document.createElement("link");
                
                s.setAttribute("rel", "stylesheet");
                s.setAttribute("href", obj.url);
                s.onload = createLoadCallback(idx);

                console.log("Loading: " + obj.url);

                document.head.appendChild(s);
            }
            else if (obj.type == "script")
            {
                var s = document.createElement("script");
         
                if (obj.contents)
                {
                    s.innerHTML = obj.contents;
                    setTimeout(createLoadCallback(idx), 0);
                }
                else
                {
                    s.src = obj.url;
                    s.onload = createLoadCallback(idx);
                }
                document.body.appendChild(s);
            }
        }

        processResource(0); // start resource retrieval
    }

    function myBookmarkLet()
    {
        if (window.initializingBookmarklet)
            return;

        if (!window.initializedBookmarklet)
        {
            window.initializingBookmarklet = true;
            initBookmarklet();
            return;
        }

        maincode.run();
    }

    this.run = function()
    {
        console.log("run");

        if (initializing)
            return;
        if (!initialized)
        {
            initializing = true;
            init(this);
            return;
        }

        var videoElements = document.getElementsByTagName("video");
        if (videoElements.length < 1)
        {
            alert("No video element found on this page");
            return;
        }

        if (video == null)
            video = videoElements[0];

    }
}

maincode.instance = null;

maincode.run = function()
{
    if (!maincode.instance)
    {
        maincode.instance = new maincode();
        console.log("Allocated new instance");
    }

    maincode.instance.run();
}
