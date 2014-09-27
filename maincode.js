maincode = function()
{
    var initialized = false;
    var initializing = false;
    var video = null;
    var subtitles = null;
    var lastShownSubIdx = -1;
    var subDiv = null;
    var inDialog = false;
    var syncOffset = 0;
    var timeScale = 1.0;
    var messageDiv = null;
    var messageTimer = null;

    var attachSubDiv = function()
    {
        var elem = document.body;
        //if (video != null)
        //    elem = video;

        if (subDiv.parent !== elem)
        {
            if (subDiv.parent)
                subDiv.parent.removeChild(subDiv);
            elem.appendChild(subDiv);
            subDiv.style.color = "red";
            subDiv.style.fontSize = "20px";
            subDiv.style.position = "absolute";
            subDiv.style.top = "10px";
            subDiv.style.left = "10px";
            subDiv.innerText = "NOPE";
        }
    }

    var showMessage = function(message)
    {
        if (messageTimer)
        {
            clearTimeout(messageTimer);
            messageTimer = null;
        }

        messageDiv.innerText = message;
        messageTimer = setTimeout(function()
        {
            messageTimer = null;
            messageDiv.innerText = "";
        }, 2000);
    }

    var syncAdjust = function(dt, absolute)
    {
        if (absolute)
            syncOffset = dt;
        else
            syncOffset += dt;

        showMessage("Sync offset: " + syncOffset.toFixed(3));
    }   

    var getAbsoluteSync = function()
    {
        inDialog = true;
        vex.dialog.prompt(
        {
            message: 'Enter sub sync offset (in seconds):',
            placeholder: '0.0',
            callback: function(value) 
            {
                inDialog = false;
                if (value !== false)
                {
                    try
                    {
                        var offset = parseFloat(value);
                        syncAdjust(offset, true);
                    }
                    catch(e)
                    {
                    }
                }
            }
        });
    }

    var getTimeScale = function()
    {
        inDialog = true;
        vex.dialog.prompt(
        {
            message: 'Enter time rescale value:',
            placeholder: '1.0',
            callback: function(value) 
            {
                inDialog = false;
                if (value !== false)
                {
                    try
                    {
                        var scale = eval(value);
                        var invScale = 1.0/scale;

                        if (scale > 0 && invScale > 0)
                        {
                            timeScale = scale;
                            showMessage("Sub timing will be rescaled by: " + timeScale.toFixed(3));
                        }
                    }
                    catch(e)
                    {
                    }
                }
            }
        });
    }

    var textToHTML = function(text)
    {
        return ((text || "") + "")  // make sure it's a string;
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\t/g, "    ")
            .replace(/ /g, "&#8203;&nbsp;&#8203;")
            .replace(/\r\n|\r|\n/g, "<br />");
    }

    var onCheckSubtitleTimeout = function()
    {
        if (!video)
            return;
        if (!subtitles)
            return;

        var currentTime = video.currentTime/timeScale + syncOffset;
        var num = subtitles.length;

        for (var i = 0 ; i < num ; i++)
        {
            var obj = subtitles[i];
            if (obj)
            {
                if (obj.subStart < currentTime && currentTime < obj.subEnd)
                {
                    if (lastShownSubIdx != i)
                    {
                        lastShownSubIdx = i;
                        subDiv.innerText = obj.subText;
                    }
                    return;
                }
            }
        }
        subDiv.innerText = "STILL NOPE";
    }

    var generalOpenDlg = null;
    
    var strip = function(s) 
    {
        return s.replace(/^\s+|\s+$/g,"");
    }

    function toSeconds(t) 
    {
        var s = 0.0;
        if(t) 
        {
            var p = t.split(':');
            for(var i=0;i<p.length;i++)
                s = s * 60 + parseFloat(p[i].replace(',', '.'))
        }
        return s;
    }
    var onSRTDataLoaded = function(srt)
    {
        console.log("Loaded data:");
        console.log(srt);
        //console.log(srtData);
        // From http://v2v.cc/~j/jquery.srt/jquery.srt.js
        srt = srt.replace(/\r\n|\r|\n/g, '\n');
        subtitles = [];

        srt = strip(srt);
        var srt_ = srt.split('\n\n');
        for(s in srt_) 
        {
            try
            {
                st = srt_[s].split('\n');
                if(st.length >= 2) 
                {
                    n = parseInt(st[0]);
                    i = strip(st[1].split(' --> ')[0]);
                    o = strip(st[1].split(' --> ')[1]);
                    t = st[2];
                    if(st.length > 2) 
                    {
                        for(j=3; j<st.length;j++)
                        t += '\n'+st[j];
                    }
                    is = toSeconds(i);
                    os = toSeconds(o);
                    subtitles[n] = { subStart:is, subEnd: os, subText: t};
                }
            }
            catch(e)
            {
                console.log("Error processing s = ", s);
                console.log(e);
            }
        }

        console.log(subtitles);
    }

    var endsWith = function(s, end, caseInsensitive)
    {
        var l = s.length;

        if (l < end.length)
            return false;

        var startIdx = l-end.length;

        if (caseInsensitive)
        {
            if (s.substr(startIdx).toLowerCase() == end.toLowerCase())
                return true;
        }
        else
        {
            if (s.substr(startIdx) == end)
                return true;
        }

        return false;
    }

    var validateFileName = function(name)
    {
        if (!endsWith(name, ".srt", true))
            throw "Filename does not end with '.srt'";
    }

    this.onSRTFileSelected = function(files)
    {
        vex.close(generalOpenDlg.data().vex.id);
        inDialog = false;

        try
        {
            if (files.length != 1)
                throw "Precisely one file must be selected";


            var file = files[0];

            validateFileName(file.name);

            var reader = new FileReader();
            
            reader.onload = function(e)
            {
                onSRTDataLoaded(e.target.result);
            }
            reader.onerror = function(s)
            {
                var msg = "Unknown error";
                try { msg = "" + reader.error.message; } catch(e) { }
                vex.dialog.alert("Error opening file:<br>" + textToHTML(msg));
            }
            reader.readAsText(file);
        }
        catch(err)
        {
            vex.dialog.alert("Error: " + textToHTML(err));
        }
    }

    var openSRTFile = function()
    {
        inDialog = true;
        generalOpenDlg = vex.dialog.alert(
            {   contentCSS: { width: "60%" },
                message: 'How do you want to load the file?' + 
                     '<li>Load a local SRT file: <input id="loadfile" type="file" onchange="maincode.instance.onSRTFileSelected(this.files)"></li></ul>'});
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

            if (inDialog)
                return;

            console.log("KeyCode = " + evt.keyCode);
            if (evt.keyCode == 79) // 'o'
                openSRTFile();
            
            if (evt.keyCode == 109) // '-'
                syncAdjust(-0.100, false);
            
            if (evt.keyCode == 107) // '+'
                syncAdjust(+0.100, false);

            if (evt.keyCode == 106) // '*'
                getAbsoluteSync();

            if (evt.keyCode == 111) // '/'
                getTimeScale();
        }
        
        setInterval(function() { onCheckSubtitleTimeout(); }, 200);
        // Launch open file stuff
        setTimeout(function() { openSRTFile(); }, 0 );

        subDiv = document.createElement("div");
        attachSubDiv();
       
        messageDiv = document.createElement("div");
        document.body.appendChild(messageDiv);
        messageDiv.style.color = "red";
        messageDiv.style.fontSize = "20px";
        messageDiv.style.position = "absolute";
        messageDiv.style.zIndex = 10;
        messageDiv.style.top = "10px";
        messageDiv.style.right = "10px";
        messageDiv.innerText = "Delay: 0";
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
