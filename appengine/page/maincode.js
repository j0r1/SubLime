maincode = function(baseUrl)
{
    var _this = this;
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

    var timeScaleObjectBase = null;
    var timeScaleObjectRef = null;

    var parametersChanged = false;
    var localStorageKey = null;

    var setTimeScalePosition = function(isBase)
    {
        if (lastShownSubIdx < 0 || lastShownSubIdx >= subtitles.length)
            return;

        var obj = subtitles[lastShownSubIdx];
        if (!obj)
            return;

        var currentTime = video.currentTime;
        var tsObj = { subTime: obj.subStart, videoTime: currentTime };

        var msg = "";
        if (isBase)
        {
            timeScaleObjectBase = tsObj;
            msg = "First: ";
        }
        else
        {
            timeScaleObjectRef = tsObj;
            msg = "Second: ";
        }
        msg += " sub " + tsObj.subTime.toFixed(3) + " --> video " + currentTime.toFixed(3);

        if (timeScaleObjectBase && timeScaleObjectRef)
        {
            if (timeScaleObjectRef.subTime <= timeScaleObjectBase.subTime)
                msg += "\nSecond subtitle time is less than first, ignoring";
            else
            {
                var subDiff = timeScaleObjectRef.subTime - timeScaleObjectBase.subTime;
                var vidDiff = timeScaleObjectRef.videoTime - timeScaleObjectBase.videoTime;
                
                timeScale = vidDiff/subDiff;
                syncOffset = timeScaleObjectBase.subTime - timeScaleObjectBase.videoTime/timeScale;
                parametersChanged = true;

                msg += "\nCalculated: time scale = " + timeScale.toFixed(3) + ", sync offset = " + syncOffset.toFixed(3)
            }
        }

        showMessage(msg);
    }

    var attachSubDiv = function()
    {
        var elem = document.body;
        elem.appendChild(subDiv);
        subDiv.style.color = "white";
        //subDiv.style.border = "dotted 1px";
        subDiv.style.fontSize = "28px";
        subDiv.style.position = "absolute";
        subDiv.style.bottom = "20px";
        subDiv.style.left = "0px";
        subDiv.style.right = "0px";
        subDiv.style.width = "95%";
        subDiv.style.margin = "auto";
        subDiv.style.textAlign = "center";
        subDiv.style.textShadow = "-2px 0 black, 0 2px black, 2px 0 black, 0 -2px black";
        subDiv.style.fontFamily = "'Titillium Web', sans-serif";
        subDiv.style.fontWeight = "bold";

        subDiv.innerText = "";
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

        parametersChanged = true;

        showMessage("Sync offset: " + syncOffset.toFixed(3));
    }   

    var getAbsoluteSync = function()
    {
        inDialog = true;
        vex.dialog.prompt(
        {
            message: 'Enter sub sync offset (in seconds):',
            placeholder: '' + syncOffset.toFixed(3),
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
            placeholder: '' + timeScale.toFixed(3),
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
                            parametersChanged = true;
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
        subDiv.innerText = "";
    }

    var loadSavedParameters = function()
    {
        try
        {
            var lastParams = JSON.parse(localStorage[localStorageKey]);

            syncOffset = lastParams.syncOffset;
            timeScale = lastParams.timeScale;
            
            var msg = "Loaded: time scale = " + timeScale.toFixed(3) + ", sync offset = " + syncOffset.toFixed(3)
        
            showMessage(msg);
        }
        catch(e)
        {
        }
    }

    var onCheckSaveParameters = function()
    {
        if (!localStorageKey)
            return;
        if (!parametersChanged)
            return;

        parametersChanged = false;
        var obj = { "syncOffset": syncOffset, "timeScale": timeScale };
        localStorage[localStorageKey] = JSON.stringify(obj);
        showMessage("Saved current parameters");
    }

    var generalOpenDlg = null;
    
    var strip = function(s) 
    {
        return s.replace(/^\s+|\s+$/g,"");
    }

    var toSeconds = function(t) 
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

    var onSRTDataLoaded = function(srt, name)
    {
        localStorageKey = name;

        console.log("Loaded data:");
        //console.log(srt);
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

        //console.log(subtitles);

        lastShownSubIdx = -1;
        syncOffset = 0;
        timeScale = 1.0;
        timeScaleObjectBase = null;
        timeScaleObjectRef = null;
        parametersChanged = false;

        loadSavedParameters();
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
                onSRTDataLoaded(e.target.result, "file://" + file.name);
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
                     '<li>Load a local SRT file: <input id="loadfile" type="file" onchange="maincode.instance.onSRTFileSelected(this.files)"></li></ul>',
                callback: function(data) 
                {
                    console.log("Closed generalOpenDlg");
                    inDialog = false;
                }
            });
    }

    var resourcesInitialized = function()
    {
        console.log("Resources initialized");
        
//        var s = document.createElement("style");
//        s.innerHTML = ".vex.vex-theme-wireframe .vex-content { width: 90%; }";
//        document.head.appendChild(s);

        vex.defaultOptions.className = 'vex-theme-wireframe';
//        vex.defaultOptions.className = 'vex-theme-top';
        vex.closeByEscape = function() { inDialog = false; }
        
        initializing = false;
        initialized = true;

        setTimeout(function() { _this.run(); }, 0);

        var oldKbdFunctionDown = document.onkeydown;
        document.onkeydown = function(evt)
        {
            if (oldKbdFunctionDown)
                oldKbdFunctionDown(evt);

            if (inDialog)
                return;

            console.log("KeyCode = " + evt.keyCode);
            if (evt.keyCode == 79) // 'o'
                openSRTFile();
            
            if (evt.keyCode == 109 || evt.keyCode == 68) // '-' or 'd'
                syncAdjust(-0.100, false);
            
            if (evt.keyCode == 107 || evt.keyCode == 70) // '+' or 'f'
                syncAdjust(+0.100, false);

        }
        
        var oldKbdFunctionUp = document.onkeyup;
        document.onkeyup = function(evt)
        {
            if (oldKbdFunctionUp)
                oldKbdFunctionUp(evt);

            if (inDialog)
                return;

            if (evt.keyCode == 106 || evt.keyCode == 71) // '*' or 'g'
                getAbsoluteSync();

            if (evt.keyCode == 111 || evt.keyCode == 72) // '/' or 'h'
                getTimeScale();

            if (evt.keyCode == 75) // 'k'
                setTimeScalePosition(true);

            if (evt.keyCode == 76) // 'l'
                setTimeScalePosition(false);
        }
        setInterval(function() { onCheckSubtitleTimeout(); }, 200);
        setInterval(function() { onCheckSaveParameters(); }, 1000);
        // Launch open file stuff
        setTimeout(function() { openSRTFile(); }, 0 );

        subDiv = document.createElement("div");
        attachSubDiv();
       
        messageDiv = document.createElement("div");
        document.body.appendChild(messageDiv);
        messageDiv.style.color = "white";
        messageDiv.style.fontSize = "20px";
        messageDiv.style.position = "absolute";
        messageDiv.style.top = "10px";
        messageDiv.style.right = "10px";
        messageDiv.style.textShadow = "-2px 0 black, 0 2px black, 2px 0 black, 0 -2px black";
        messageDiv.style.fontFamily = "'Titillium Web', sans-serif";
        messageDiv.style.fontWeight = "bold";
        messageDiv.innerText = "";
    }

    var init = function()
    {
        var resources = [ 
                        { type: "script", url: baseUrl + "/jquery.min.js" },
                        { type: "script", contents: "var jQuery_2_1_0_for_vex = jQuery.noConflict(true);", url: "internal" },
                        { type: "link", url: baseUrl + "/vex.css" },
                        { type: "link", url: baseUrl + "/vex-theme-wireframe.css" },
                        { type: "script", url: baseUrl + "/vex.js" },
                        { type: "script", url: baseUrl + "/vex.dialog.js" },
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
        maincode.instance = new maincode("https://sub-lime.appspot.com");
        console.log("Allocated new instance");
    }

    maincode.instance.run();
}
