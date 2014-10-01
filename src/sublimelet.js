SubLimeLet = function(baseUrl)
{
    var _this = this;
    var m_initialized = false;
    var m_initializing = false;
    var m_video = null;
    var m_subtitles = null;
    var m_lastShownSubIdx = -1;
    var m_subtitleDiv = null;
    var m_inDialog = false;
    var m_syncOffset = 0;
    var m_timeScale = 1.0;
    var m_messageDiv = null;
    var m_messageTimer = null;

    var m_timeScaleObjectBase = null;
    var m_timeScaleObjectRef = null;

    var m_parametersChanged = false;
    var m_localStorageKey = null;

    var m_overlayDiv = null;

    var m_generalOpenDlg = null;

    var toSubTime = function(S)
    {
        return (S - m_syncOffset)*m_timeScale;
    }

    var toTimeString = function(t)
    {
        if (t <= 0)
            return "00:00:00,000";

        var hours = Math.floor(t/3600);
        var tmp = t - hours*3600;
        var minutes = Math.floor(tmp/60);
        tmp = tmp-minutes*60;

        var hs = "" + hours;
        if (hs.length < 2)
            hs = "0" + hs;
        var ms = "" + minutes;
        if (ms.length < 2)
            ms = "0" + ms;
        var ss = tmp.toFixed(3);

        var idx = ss.indexOf(".");
        if (idx < 2)
            ss = "0" + ss;

        return hs + ":" + ms + ":" + ss;
    }

    var saveSyncAdjustedSubtitles = function()
    {
        if (!m_subtitles)
            return;

        var resyncedSRT = "";
        var subLen = m_subtitles.length;
        for (var i = 0 ; i < subLen ; i++)
        {
            var obj = m_subtitles[i];
            if (obj)
            {
                resyncedSRT += "" + i + "\n";
                resyncedSRT += toTimeString(toSubTime(obj.subStart)) + " --> " + toTimeString(toSubTime(obj.subEnd)) + "\n";
                resyncedSRT += obj.subText;

                var tl = obj.subText.length;

                if (tl > 1 && obj.subText[tl-1] != '\n')
                    resyncedSRT += "\n";

                resyncedSRT += "\n";
            }
        }

        // Is this the right character set?
        var blob = new Blob([resyncedSRT], {type: "text/plain;charset=utf-8"});

        vex.dialog.prompt(
        {
            afterOpen: function() { m_inDialog = true; },
            afterClose: function() { m_inDialog = false; },
            message: 'Enter the name of the file to write the (resynced) subtitle info to',
            placeholder: 'newfile.srt',
            callback: function(value) 
            {
                console.log(value);
                if (value !== false)
                    saveAs(blob, value);
            }
        });
    }

    var setTimeScalePosition = function(isBase)
    {
        if (m_lastShownSubIdx < 0 || m_lastShownSubIdx >= m_subtitles.length)
            return;

        var obj = m_subtitles[m_lastShownSubIdx];
        if (!obj)
            return;

        var currentTime = m_video.currentTime;
        var tsObj = { subTime: obj.subStart, m_videoTime: currentTime };

        var msg = "";
        if (isBase)
        {
            m_timeScaleObjectBase = tsObj;
            msg = "First: ";
        }
        else
        {
            m_timeScaleObjectRef = tsObj;
            msg = "Second: ";
        }
        msg += " sub " + tsObj.subTime.toFixed(3) + " --> m_video " + currentTime.toFixed(3);

        if (m_timeScaleObjectBase && m_timeScaleObjectRef)
        {
            if (m_timeScaleObjectRef.subTime <= m_timeScaleObjectBase.subTime)
                msg += "\nSecond subtitle time is less than first, ignoring";
            else
            {
                var subDiff = m_timeScaleObjectRef.subTime - m_timeScaleObjectBase.subTime;
                var vidDiff = m_timeScaleObjectRef.m_videoTime - m_timeScaleObjectBase.m_videoTime;
                
                m_timeScale = vidDiff/subDiff;
                m_syncOffset = m_timeScaleObjectBase.subTime - m_timeScaleObjectBase.m_videoTime/m_timeScale;
                m_parametersChanged = true;

                msg += "\nCalculated: time scale = " + m_timeScale.toFixed(3) + ", sync offset = " + m_syncOffset.toFixed(3)
            }
        }

        showMessage(msg);
    }

    var attachSubDiv = function()
    {
        var elem = m_overlayDiv;
        //var elem = document.body;
        //if (m_video)
        //    elem = m_video.parentNode; // this should be the special div
        
        elem.appendChild(m_subtitleDiv);

        m_subtitleDiv.innerText = "";
    }

    var attachMessageDiv = function()
    {
        var elem = m_overlayDiv;
        //var elem = document.body;
        //if (m_video)
        //    elem = m_video.parentNode; // this should be the special div

        elem.appendChild(m_messageDiv);

        m_messageDiv.innerText = "";
    }

    var showMessage = function(message)
    {
        if (m_messageTimer)
        {
            clearTimeout(m_messageTimer);
            m_messageTimer = null;
        }

        m_messageDiv.innerText = message;
        m_messageTimer = setTimeout(function()
        {
            m_messageTimer = null;
            m_messageDiv.innerText = "";
        }, 2000);
    }

    var syncAdjust = function(dt, absolute)
    {
        if (absolute)
            m_syncOffset = dt;
        else
            m_syncOffset += dt;

        m_parametersChanged = true;

        showMessage("Sync offset: " + m_syncOffset.toFixed(3));
    }   

    var getAbsoluteSync = function()
    {
        vex.dialog.prompt(
        {
            message: 'Enter sub sync offset (in seconds):',
            placeholder: '' + m_syncOffset.toFixed(3),
            callback: function(value) 
            {
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
            },
            afterOpen: function() { m_inDialog = true; },
            afterClose: function() { m_inDialog = false; },
        });
    }

    var getTimeScale = function()
    {
        vex.dialog.prompt(
        {
            message: 'Enter time rescale value:',
            placeholder: '' + m_timeScale.toFixed(3),
            afterOpen: function() { m_inDialog = true; },
            afterClose: function() { m_inDialog = false; },
            callback: function(value) 
            {
                m_inDialog = false;
                if (value !== false)
                {
                    try
                    {
                        var scale = eval(value);
                        var invScale = 1.0/scale;

                        if (scale > 0 && invScale > 0)
                        {
                            m_timeScale = scale;
                            m_parametersChanged = true;
                            showMessage("Sub timing will be rescaled by: " + m_timeScale.toFixed(3));
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

    var onCheckVideoSize = function()
    {
        if (!m_video)
            return;

        var r = m_video.getBoundingClientRect();

        m_overlayDiv.style.width = "" + r.width + "px";
        m_overlayDiv.style.height = "" + r.height + "px";
        m_overlayDiv.style.top = "" + (window.pageYOffset + r.top) + "px";
        m_overlayDiv.style.left = "" + (window.pageXOffset + r.left) + "px";
    }

    var onCheckSubtitleTimeout = function()
    {
        if (!m_video)
            return;
        if (!m_subtitles)
            return;

        if (isNaN(m_syncOffset))
        {
            m_syncOffset = 0.0;
            m_parametersChanged = true;
        }
        if (isNaN(m_timeScale))
        {
            m_timeScale = 1.0;
            m_parametersChanged = true;
        }

        var currentTime = m_video.currentTime/m_timeScale + m_syncOffset;
        var num = m_subtitles.length;

        for (var i = 0 ; i < num ; i++)
        {
            var obj = m_subtitles[i];
            if (obj)
            {
                if (obj.subStart < currentTime && currentTime < obj.subEnd)
                {
                    if (m_lastShownSubIdx != i)
                    {
                        m_lastShownSubIdx = i;
                        m_subtitleDiv.innerText = obj.subText;
                    }
                    return;
                }
            }
        }
        m_subtitleDiv.innerText = "";
    }

    var loadSavedParameters = function()
    {
        try
        {
            var lastParams = JSON.parse(localStorage[m_localStorageKey]);

            m_syncOffset = lastParams.m_syncOffset;
            m_timeScale = lastParams.m_timeScale;
            
            var msg = "Loaded: time scale = " + m_timeScale.toFixed(3) + ", sync offset = " + m_syncOffset.toFixed(3)
        
            showMessage(msg);
        }
        catch(e)
        {
        }
    }

    var onCheckSaveParameters = function()
    {
        if (!m_localStorageKey)
            return;
        if (!m_parametersChanged)
            return;

        m_parametersChanged = false;
        var obj = { "m_syncOffset": m_syncOffset, "m_timeScale": m_timeScale };
        localStorage[m_localStorageKey] = JSON.stringify(obj);
        showMessage("Saved current parameters");
    }
 
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
        m_localStorageKey = name;

        console.log("Loaded data:");
        //console.log(srt);
        //console.log(srtData);
        // From http://v2v.cc/~j/jquery.srt/jquery.srt.js
        srt = srt.replace(/\r\n|\r|\n/g, '\n');
        m_subtitles = [];

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
                    m_subtitles[n] = { subStart:is, subEnd: os, subText: t};
                }
            }
            catch(e)
            {
                console.log("Error processing s = ", s);
                console.log(e);
            }
        }

        //console.log(m_subtitles);

        m_lastShownSubIdx = -1;
        m_syncOffset = 0;
        m_timeScale = 1.0;
        m_timeScaleObjectBase = null;
        m_timeScaleObjectRef = null;
        m_parametersChanged = false;

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
        vex.close(m_generalOpenDlg.data().vex.id);

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
                showAlert("Error opening file:<br>" + textToHTML(msg));
            }
            reader.readAsText(file);
        }
        catch(err)
        {
            showAlert("Error: " + textToHTML(err));
        }
    }

    var showAlert = function(msg)
    {
        vex.dialog.alert(
        {   
            message: msg,
            afterOpen: function() { m_inDialog = true; },
            afterClose: function() { m_inDialog = false; },
        });
    }

    var openSRTFile = function()
    {
        m_generalOpenDlg = vex.dialog.alert(
        {   
            contentCSS: { width: "60%" },
            message: 'How do you want to load the file?' + 
                     '<li>Load a local SRT file: <input id="loadfile" type="file" onchange="SubLimeLet.instance.onSRTFileSelected(this.files)"></li></ul>',
            afterOpen: function() { m_inDialog = true; },
            afterClose: function() { m_inDialog = false; },
        });
    }

    var resourcesInitialized = function()
    {
        console.log("Resources m_initialized");

        vex.defaultOptions.className = 'vex-theme-wireframe';
        //vex.closeByEscape = function() { }
        
        m_initializing = false;
        m_initialized = true;

        setTimeout(function() { _this.run(); }, 0);

        var oldKbdFunctionDown = document.onkeydown;
        document.onkeydown = function(evt)
        {
            if (oldKbdFunctionDown)
                oldKbdFunctionDown(evt);

            if (m_inDialog)
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

            if (m_inDialog)
                return;

            if (evt.keyCode == 106 || evt.keyCode == 71) // '*' or 'g'
                getAbsoluteSync();

            if (evt.keyCode == 111 || evt.keyCode == 72) // '/' or 'h'
                getTimeScale();

            if (evt.keyCode == 75) // 'k'
                setTimeScalePosition(true);

            if (evt.keyCode == 76) // 'l'
                setTimeScalePosition(false);

            if (evt.keyCode == 83) // 's'
                saveSyncAdjustedSubtitles();
        }
        setInterval(function() { onCheckSubtitleTimeout(); }, 200);
        setInterval(function() { onCheckSaveParameters(); }, 1000);
        setInterval(function() { onCheckVideoSize(); }, 1000);
        // Launch open file stuff
        setTimeout(function() { openSRTFile(); }, 0 );
    }

    var init = function()
    {
        var resources = [ 
                        { type: "link", url: baseUrl + "/vex.css" },
                        { type: "link", url: baseUrl + "/vex-theme-wireframe.css" },
                        { type: "link", url: baseUrl + "/sublime.css" },
                        { type: "script", url: baseUrl + "/jquery.min.js" },
                        { type: "script", contents: "var jQuery_2_1_0_for_vex = jQuery.noConflict(true);", url: "internal" },
                        { type: "script", url: baseUrl + "/vex.js" },
                        { type: "script", url: baseUrl + "/vex.dialog.js" },
                        { type: "script", url: baseUrl + "/FileSaver.js" },
                      ];

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
        if (window.m_initializingBookmarklet)
            return;

        if (!window.m_initializedBookmarklet)
        {
            window.m_initializingBookmarklet = true;
            initBookmarklet();
            return;
        }

        SubLimeLet.run();
    }

    this.run = function()
    {
        console.log("run");

        if (m_initializing)
            return;
        if (!m_initialized)
        {
            m_initializing = true;
            init(this);
            return;
        }

        // For now, only overlay on one element
        if (m_video)
            return;

        var m_videoElements = document.getElementsByTagName("video");
        if (m_videoElements.length < 1)
        {
            alert("No m_video element found on this page");
            return;
        }

        m_video = m_videoElements[0];
    
        var r = m_video.getBoundingClientRect();
        console.log(r);

        m_overlayDiv = document.createElement("div");
        m_overlayDiv.setAttribute("id", "sublimevideodiv");

        m_subtitleDiv = document.createElement("div");
        m_subtitleDiv.setAttribute("id", "sublimesubtitlediv");
        m_messageDiv = document.createElement("div");
        m_messageDiv.setAttribute("id", "sublimemessagediv");

        m_overlayDiv.style.width = "" + r.width + "px";
        m_overlayDiv.style.height = "" + r.height + "px";
        m_overlayDiv.style.top = "" + (window.pageYOffset + r.top) + "px";
        m_overlayDiv.style.left = "" + (window.pageXOffset + r.left) + "px";

        document.body.appendChild(m_overlayDiv);
        attachSubDiv();
        attachMessageDiv();
    }
}

SubLimeLet.instance = null;

SubLimeLet.run = function(baseUrl)
{
    if (!SubLimeLet.instance)
    {
        SubLimeLet.instance = new SubLimeLet(baseUrl);
        console.log("Allocated new instance");
    }

    SubLimeLet.instance.run();
}
