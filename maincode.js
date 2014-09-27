

maincode = function()
{
    var initialized = false;
    var initializing = false;

    var resourcesInitialized = function(_this)
    {
        console.log("Resources initialized");
        
//        var s = document.createElement("style");
//        s.innerHTML = ".vex.vex-theme-wireframe .vex-content { width: 90%; }";
//        document.head.appendChild(s);

//        vex.defaultOptions.className = 'vex-theme-wireframe';
        vex.defaultOptions.className = 'vex-theme-top';
        
        initializing = false;
        initialized = true;

        setTimeout(function() { _this.run(); }, 0);
    }

    var init = function(_this)
    {
        var resources = [ 
                        { type: "script", url: "https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js" },
                        //{ type: "link", url: "http://github.hubspot.com/vex/css/vex.css" },
                        //{ type: "link", url: "http://github.hubspot.com/vex/css/vex-theme-wireframe.css" },
                        //{ type: "script", url: "http://github.hubspot.com/vex/js/vex.js" },
                        //{ type: "script", url: "http://github.hubspot.com/vex/js/vex.dialog.js" },
                        { type: "link", url: "https://pyservsite.appspot.com/vex.css" },
                        //{ type: "link", url: "https://pyservsite.appspot.com/vex-theme-wireframe.css" },
                        { type: "link", url: "https://pyservsite.appspot.com/vex-theme-top.css" },
                        { type: "script", url: "https://pyservsite.appspot.com/vex.js" },
                        { type: "script", url: "https://pyservsite.appspot.com/vex.dialog.js" },
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
                
                s.src = obj.url;
                s.onload = createLoadCallback(idx);

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

    var processing = false;
    var gotClick = false;

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

        if (processing)
        {
            alert("Already rendering");
            return;
        }

        processing = true;

        var replaceImageWithVideo = function(clickedImg)
        {
            console.log("replaceImageWithVideo");
            var error = function(e)
            {
                console.log(e);
                vex.dialog.alert({ message: 'Error getting webcam',
                                   callback: function() { gotClick = false; processing = false; document.body.firstChild.firstChild.style.pointerEvents = ""; } } );
            }

            if (!navigator.getUserMedia)
                navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

            navigator.getUserMedia({video: true, audio: false}, function(stream)
            {
                console.log("Got stream");
                console.log(stream);
                console.log("After stream");

                var vid = null;

                vex.dialog.alert({ 
                    message: 'Press ok when ready',
                    callback: function() 
                    { 
                        var canvas = document.createElement("canvas");
                        var context = canvas.getContext("2d");

                        canvas.width = vid.videoWidth;
                        canvas.height = vid.videoHeight;
                        context.drawImage(vid, 0, 0);

                        processing = false; 
                        gotClick = false;
                        stream.stop();
                        vid.src = null;

                        document.body.removeChild(vid);
                        vid = null;

                        var w = jQuery(clickedImg).outerWidth();
                        var h = jQuery(clickedImg).outerHeight();

                        clickedImg.src = canvas.toDataURL("image/jpg");
                        clickedImg.style.width = "" + w + "px";
                        clickedImg.style.height = "" + h + "px";
                    } 
                });

                var URL = window.webkitURL || window.URL;

                vid = document.createElement("video")
                vid.src = URL.createObjectURL(stream);

                var imgPos = jQuery(clickedImg).offset();
                console.log(imgPos);

                vid.style.left = "" + imgPos.left + "px";
                vid.style.top = "" + imgPos.top + "px";
                vid.style.width = "" + jQuery(clickedImg).outerWidth() + "px";
                vid.style.height = "" + jQuery(clickedImg).outerHeight() + "px";
                vid.style.position = "absolute";
                vid.setAttribute("autoplay","yes");

                document.body.appendChild(vid);
            }, error);
        }        

        var images = document.getElementsByTagName("img");

        if (images.length == 0)
        {
            alert("No images found");
        }
        else
        {
            var handled = false;
            var createHandler = function(img)
            {
                return function(evt)
                {
                    if (!handled)
                    {
                        replaceImageWithVideo(img);

                        handled = true;
                        evt.preventDefault();

                        return false;
                    }
                    return true;
                }
            }

            for (var i = 0 ; i < images.length ; i++)
            {
                var img = images[i];
                var handler = createHandler(img);

                jQuery(img).on("click", handler);
            }

            vex.dialog.alert({ 
                message: 'Press OK and click on an image',
                callback: function() {  } 
            });
        }
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
