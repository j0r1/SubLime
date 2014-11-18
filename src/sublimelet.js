
var SubLimeLetRun = (function()
{
    var instance = null;

    var GLHelper = function(canvas)
    {
        var _this = this; // in case we need it in a private function
        var m_canvas = null;
        var m_context = null;
        var m_init = false;

        var m_texture = null;

        var m_fragmentShader = null;
        var m_vertexShader = null;
        var m_program = null;
        var m_vertexBuffer = null;
        var m_texCoordBuffer = null;

        var m_locWinSize = null;
        var m_locWinPos = null;
        var m_locVidSize = null;

        var m_requesting = false;

        this.init = function(canvas)
        {
            if (m_init)
                throw "Already initialized";

            m_canvas = canvas;
            m_context = canvas.getContext("experimental-webgl");

            initWebGLContext();
            _this.adjustViewPort();

            // Do this before attach and startRender since they check this
            m_init = true;
        }

        var loadShader = function(shaderSource, shaderType) 
        {
            var shader = m_context.createShader(shaderType);
            m_context.shaderSource(shader, shaderSource);
            m_context.compileShader(shader);

            var compiled = m_context.getShaderParameter(shader, m_context.COMPILE_STATUS);
            if (!compiled) 
            {
                var lastError = m_context.getShaderInfoLog(shader);
                m_context.deleteShader(shader);
        
                console.log("Error compiling shader:" + lastError);
                return null;
            }

            return shader;
        }

        var initWebGLContext = function()
        {
            var vertexShaderSource = [ "",
                "attribute vec2 a_position;",
                "attribute vec2 a_texCoord;",
                "varying vec2 v_texCoord;",
                "void main()",
                "{",
                "    v_texCoord = a_texCoord;",
                "    gl_Position = vec4(a_position.x*2.0-1.0, -(a_position.y*2.0-1.0), 0, 1);",
                "}" ].join("\n");
        
            var fragmentShaderSource = [ "",
                "precision mediump float;",
                "uniform sampler2D u_image;",
                "varying vec2 v_texCoord;",
                "",
                "void main()",
                "{",
                "    gl_FragColor = texture2D(u_image, v_texCoord);",
                "}" ].join("\n");

            var vertexShader = loadShader(vertexShaderSource, m_context.VERTEX_SHADER);
            var fragmentShader = loadShader(fragmentShaderSource, m_context.FRAGMENT_SHADER);

            var program = m_context.createProgram();
            m_context.attachShader(program, vertexShader);
            m_context.attachShader(program, fragmentShader);
            m_context.linkProgram(program);
            
            m_context.useProgram(program);

            m_vertexShader = vertexShader;
            m_fragmentShader = fragmentShader;
            m_program = program;

            var positionLocation = m_context.getAttribLocation(program, "a_position");
            var buffer = m_context.createBuffer();

            m_context.bindBuffer(m_context.ARRAY_BUFFER, buffer);
            m_context.bufferData(m_context.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]), m_context.STATIC_DRAW);
            m_context.enableVertexAttribArray(positionLocation);
            m_context.vertexAttribPointer(positionLocation, 2, m_context.FLOAT, false, 0, 0);

            m_vertexBuffer = buffer;

            var texCoordLocation = m_context.getAttribLocation(program, "a_texCoord");
            var texCoordBuffer = m_context.createBuffer();

            m_context.bindBuffer(m_context.ARRAY_BUFFER, texCoordBuffer);
            m_context.bufferData(m_context.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]), m_context.STATIC_DRAW);
            m_context.enableVertexAttribArray(texCoordLocation);
            m_context.vertexAttribPointer(texCoordLocation, 2, m_context.FLOAT, false, 0, 0);

            m_texCoordBuffer = texCoordBuffer;

            //m_locVidSize = m_context.getUniformLocation(program, "u_vidSize");
            //m_locWinPos = m_context.getUniformLocation(program, "u_winPos");
            //m_locWinSize = m_context.getUniformLocation(program, "u_winSize");

            m_texture = m_context.createTexture();
            m_context.bindTexture(m_context.TEXTURE_2D, m_texture);
            m_context.texParameteri(m_context.TEXTURE_2D, m_context.TEXTURE_MAG_FILTER, m_context.NEAREST);
            m_context.texParameteri(m_context.TEXTURE_2D, m_context.TEXTURE_MIN_FILTER, m_context.NEAREST);
            m_context.texParameteri(m_context.TEXTURE_2D, m_context.TEXTURE_WRAP_S, m_context.CLAMP_TO_EDGE);
            m_context.texParameteri(m_context.TEXTURE_2D, m_context.TEXTURE_WRAP_T, m_context.CLAMP_TO_EDGE);
            // Make sure there's actual texture data, to prevent WebGL error messages
            //m_context.texImage2D(m_context.TEXTURE_2D, 0, m_context.RGBA, m_context.RGBA, m_context.UNSIGNED_BYTE, m_oneByOneImage);
        }

        this.adjustViewPort = function()
        {
            m_context.viewport(0, 0, m_canvas.width, m_canvas.height);
        }

        this.setVideoTexture = function(videoElem)
        {
            m_context.viewport(0, 0, m_canvas.width, m_canvas.height);
            m_context.clear(m_context.COLOR_BUFFER_BIT | m_context.DEPTH_BUFFER_BIT);
            m_context.bindTexture(m_context.TEXTURE_2D, m_texture);
            m_context.texImage2D(m_context.TEXTURE_2D, 0, m_context.RGBA, m_context.RGBA, m_context.UNSIGNED_BYTE, videoElem);
            m_context.drawArrays(m_context.TRIANGLES, 0, 6);
        }

        this.setVideoSize = function(w, h)
        {
            m_context.uniform2f(m_locVidSize, w, h);
        }

        this.setWindowPosition = function(x, y)
        {
            m_context.uniform2f(m_locWinPos, x, y);
        }

        this.setWindowSize = function(w, h)
        {
            m_context.uniform2f(m_locWinSize, w, h);
        }

        _this.init(canvas);
    }

    var SubLimeLet = function(baseUrl)
    {
        var _this = this;
        var m_initialized = false;
        var m_initializing = false;
        var m_video = null;
        var m_subtitles = null;
        var m_lastShownSubIdx = -1;
        var m_subtitleDiv = null;
        var m_subtitleCleared = true;
        var m_inDialog = false;
        var m_syncOffset = 0;
        var m_timeScale = 1.0;
        var m_messageDiv = null;
        var m_messageText = "";
        var m_messageTimer = null;

        var m_timeScaleObjectBase = null;
        var m_timeScaleObjectRef = null;

        var m_parametersChanged = false;
        var m_localStorageKey = null;

        var m_overlayDiv = null;
        var m_haveInnerText = false;

        var m_generalOpenDlg = null;

        var m_oldKbdFunctionDown = null;
        var m_oldKbdFunctionUp = null;
        var m_oldKbdFunctionPress = null;

        var toVideoTime = function(S)                                             { return (S - m_syncOffset)*m_timeScale; }
        var toSubtitleTime = function(V)                                          { return V/m_timeScale + m_syncOffset; }

        var m_keyPreferences = 80; // 'p'

        var m_keyOpenFileDefault = [ 'o' ]; // 'o'
        var m_keyDownAdjustDefault = [ '-', 'd' ]; // '-' or 'd'
        var m_keyUpAdjustDefault = [ '+', 'f' ]; // '+' or 'f'
        var m_keyAbsoluteSyncDefault = [ '*', 'g' ]; // '*' or 'g'
        var m_keyAbsoluteScaleDefault = [ '/', 'h' ]; // '/' or 'h'
        var m_keySyncPos1Default = [ 'k', 'c' ]; // 'k' or 'c'
        var m_keySyncPos2Default = [ 'l', 'v' ]; // 'l' or 'v'
        var m_keySaveSubtitlesDefault = [ 's' ]; // 's'
        var m_keyFullscreenDefault = [ 'F' ];

        var copyObject = function(l)                                                { return JSON.parse(JSON.stringify(l)); }

        var m_keyOpenFile = copyObject(m_keyOpenFileDefault);
        var m_keyDownAdjust = copyObject(m_keyDownAdjustDefault);
        var m_keyUpAdjust = copyObject(m_keyUpAdjustDefault);
        var m_keyAbsoluteSync = copyObject(m_keyAbsoluteSyncDefault);
        var m_keyAbsoluteScale = copyObject(m_keyAbsoluteScaleDefault);
        var m_keySyncPos1 = copyObject(m_keySyncPos1Default);
        var m_keySyncPos2 = copyObject(m_keySyncPos2Default);
        var m_keySaveSubtitles = copyObject(m_keySaveSubtitlesDefault);
        var m_keyFullscreen = copyObject(m_keyFullscreenDefault);

        var m_usingTestSubtitle = false;

        var m_loadCachedSubtitleOnStart = false;

        var m_fullScreenDiv = null;
        var m_fullScreenDiv2 = null;
        var m_fullScreenCanvas = null;
        var m_glHelper = null;
        var m_fullScreen = false;
        var m_fullScreenUpdateTimer = null;

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
            var ss = tmp.toFixed(3).replace('.',',');

            var idx = ss.indexOf(",");
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
                if (obj && obj.subStart >= 0) // no negative times
                {
                    resyncedSRT += "" + i + "\n";
                    resyncedSRT += toTimeString(toVideoTime(obj.subStart)) + " --> " + toTimeString(toVideoTime(obj.subEnd)) + "\n";
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
            if (m_video == null || m_subtitles == null)
                return;

            var currentTime = m_video.currentTime;
            var subTime = toSubtitleTime(currentTime);

            if (isNaN(subTime))
            {
                showMessage("Error calculating subtitle time, check offset or scale factor");
                return;
            }

            var tsObj = { subTime: subTime, videoTime: currentTime };

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
            msg += " sub " + tsObj.subTime.toFixed(3) + " --> video " + currentTime.toFixed(3);

            if (m_timeScaleObjectBase && m_timeScaleObjectRef)
            {
                if (m_timeScaleObjectRef.subTime <= m_timeScaleObjectBase.subTime)
                    msg += "\nSecond subtitle time is less than first, ignoring";
                else
                {
                    var subDiff = m_timeScaleObjectRef.subTime - m_timeScaleObjectBase.subTime;
                    var vidDiff = m_timeScaleObjectRef.videoTime - m_timeScaleObjectBase.videoTime;
                    
                    m_timeScale = vidDiff/subDiff;
                    m_syncOffset = m_timeScaleObjectBase.subTime - m_timeScaleObjectBase.videoTime/m_timeScale;
                    m_parametersChanged = true;

                    msg += "\nCalculated: time scale = " + m_timeScale.toFixed(3) + ", sync offset = " + m_syncOffset.toFixed(3)
                }
            }

            showMessage(msg);
        }

        var showMessage = function(message, clear)
        {
            if (m_messageTimer)
            {
                clearTimeout(m_messageTimer);
                m_messageTimer = null;
            }

            if (clear)
                m_messageText = message;
            else
            {
                if (m_messageText.length > 0)
                    m_messageText += "\n";
                m_messageText += message;
            }
            setMessageText(m_messageText);

            m_messageTimer = setTimeout(function()
            {
                m_messageTimer = null;
                m_messageText = "";
                setMessageText("");
            }, 4000);
        }

        var syncAdjust = function(dt, absolute)
        {
            if (absolute)
                m_syncOffset = dt;
            else
                m_syncOffset += dt;

            m_parametersChanged = true;

            showMessage("Sync offset: " + m_syncOffset.toFixed(3), true);
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
            });
        }

        var getTimeScale = function()
        {
            vex.dialog.prompt(
            {
                message: 'Enter time rescale value:',
                placeholder: '' + m_timeScale.toFixed(3),
                callback: function(value) 
                {
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
                                showMessage("Sub timing will be rescaled by: " + m_timeScale.toFixed(3), true);
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
                .replace(/ /g, "&#8203; &#8203;")
                .replace(/\r\n|\r|\n/g, "<br />");
        }

        var onCheckVideoSizeTimeout = function()
        {
            if (!m_video)
                return;
            if (!m_overlayDiv)
                return;

            var r = m_video.getBoundingClientRect();

            if (m_fullScreen)
                r = m_fullScreenDiv2.getBoundingClientRect();

            m_overlayDiv.style.width = "" + r.width + "px";
            m_overlayDiv.style.height = "" + r.height + "px";

            if (m_fullScreen)
            {
                m_overlayDiv.style.top = "" + r.top + "px";
                m_overlayDiv.style.left = "" + r.left + "px";
            }
            else
            {
                m_overlayDiv.style.top = "" + (window.pageYOffset + r.top) + "px";
                m_overlayDiv.style.left = "" + (window.pageXOffset + r.left) + "px";
            }
        }

        var setSubTitleText = function(txt)
        {
            /*
            if (m_haveInnerText)
                m_subtitleDiv.innerText = txt;
            else
                m_subtitleDiv.innerHTML = textToHTML(txt);
            */

            if (txt.length == 0) // in case there's no text to display
            {
                m_subtitleDiv.innerHTML = "";
                return;
            }

            var htmlSrc = "";
            var iCount = 0;
            var bCount = 0;
            var uCount = 0;
            var fontCount = 0;

            var lastPos = 0;
            var idx = txt.indexOf("<");
            var done = false;

            while (idx >= 0 && !done)
            {
                var tagStr = txt.substr(idx, 3).toLowerCase();

                if (tagStr == "<i>" || tagStr == "<b>" || tagStr == "<u>")
                {
                    if (tagStr == "<i>")
                        iCount++;
                    else if (tagStr == "<u>")
                        uCount++;
                    else if (tagStr == "<b>")
                        bCount++;

                    htmlSrc += textToHTML(txt.substr(lastPos, (idx-lastPos)));
                    htmlSrc += tagStr;
                    
                    lastPos = idx+tagStr.length;
                    idx = txt.indexOf("<", lastPos);

                }
                else
                {
                    tagStr = txt.substr(idx, 4).toLowerCase();
                    if (tagStr == "</i>" || tagStr == "</b>" || tagStr == "</u>")
                    {
                        var ok = false;

                        if (tagStr == "</i>" && iCount > 0)
                        {
                            iCount--;
                            ok = true;
                        }
                        else if (tagStr == "</u>" && uCount > 0)
                        {
                            uCount--;
                            ok = true;
                        }
                        else if (tagStr == "</b>" && bCount > 0)
                        {
                            bCount--;
                            ok = true;
                        }

                        if (ok)
                        {
                            htmlSrc += textToHTML(txt.substr(lastPos, (idx-lastPos)));
                            htmlSrc += tagStr;

                            lastPos = idx+4;
                            idx = txt.indexOf("<", lastPos);
                        }
                        else
                        {
                            // Not a valid tag (count not ok), progress towards the next
                            idx = txt.indexOf("<", idx+1);
                        }
                    }
                    else
                    {
                        var fs = '<font color="';

                        tagStr = txt.substr(idx, fs.length).toLowerCase();
                        if (tagStr == fs)
                        {
                            var p = txt.indexOf('">', idx+fs.length);
                            
                            if (p >= 0)
                            {
                                // TODO: better checks on color;
                            
                                var colStr = "";
                                var allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789# ";

                                for (var i = idx+fs.length ; i < p ; i++)
                                {
                                    var c = txt[i];
                                    if (allowedChars.indexOf(c) >= 0)
                                        colStr += c;
                                    else
                                        colStr += " ";
                                }

                                htmlSrc += textToHTML(txt.substr(lastPos, (idx-lastPos)));
                                htmlSrc += '<font color="' + colStr + '">';

                                lastPos = p+2;
                                idx = txt.indexOf("<", lastPos);

                                fontCount++;
                            }
                            else
                            {
                                // No match found, just progress towards the next
                                idx = txt.indexOf("<", idx+fs.length);
                            }
                        }
                        else
                        {
                            var endfont = "</font>";
                            tagStr = txt.substr(idx, endfont.length).toLowerCase();

                            if (tagStr == endfont && fontCount > 0)
                            {
                                fontCount--;

                                htmlSrc += textToHTML(txt.substr(lastPos, (idx-lastPos)));
                                htmlSrc += endfont;

                                lastPos = idx+endfont.length;
                                idx = txt.indexOf("<", lastPos);
                            }
                            else
                            {
                                // No match found, just progress towards the next
                                idx = txt.indexOf("<", idx+1);
                            }
                        }
                    }
                }
            }

            var rest = txt.length - lastPos;
            if (rest > 0)
                htmlSrc += textToHTML(txt.substr(lastPos, rest));

            // Make sure all the tags are closed

            function closeTags(c, s)
            {
                while (c > 0)
                {
                    htmlSrc += s;
                    c--;
                }
            }

            closeTags(iCount, "</i>");
            closeTags(bCount, "</b>");
            closeTags(uCount, "</u>");
            closeTags(fontCount, "</font>");

            m_subtitleDiv.innerHTML = htmlSrc;
        }
        
        var setMessageText = function(txt)
        {
            if (m_haveInnerText)
                m_messageDiv.innerText = txt;
            else
                m_messageDiv.innerHTML = textToHTML(txt);
        }

        var onCheckSubtitleTimeout = function()
        {
            if (!m_video)
                return;
            if (!m_subtitles)
                return;
            if (m_usingTestSubtitle)
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

            var currentTime = toSubtitleTime(m_video.currentTime);
            var num = m_subtitles.length;

            var prevObj = null;
            for (var j = 0 ; j < num ; j++)
            {
                // cycles through all the subtitles, starting from the one before the last shown one
                var i = (j + m_lastShownSubIdx + num - 1)%num;
                var obj = m_subtitles[i];
                if (obj)
                {
                    if (obj.subStart < currentTime && currentTime < obj.subEnd)
                    {
                        //console.log("Found at j = " + j);
                        if (m_lastShownSubIdx != i || m_subtitleCleared)
                        {
                            m_lastShownSubIdx = i;
                            m_subtitleCleared = false;
                            setSubTitleText(obj.subText);
                        }
                        return;
                    }

                    if (prevObj)
                    {
                        if (prevObj.subEnd < currentTime && currentTime < obj.subStart)
                        {
                            //console.log("Found empty at j = " + j);
                            // Definitely no subtitle to show
                            m_subtitleCleared = true;
                            setSubTitleText("");
                            return;
                        }
                    }

                    prevObj = obj;
                }
            }

            //console.log("No sub, but took a while to figure out");
            m_subtitleCleared = true;
            setSubTitleText("");
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

        var onCheckSaveParametersTimeout = function()
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
     
        var toSeconds = function(t) 
        {
            var s = 0.0;
            var p = t.split(':');
            for(var i = 0; i < p.length ; i++)
                s = s * 60 + parseFloat(p[i].replace(',', '.'))
            
            return s;
        }

        var clearSubtitleSettings = function()
        {
            m_lastShownSubIdx = -1;
            m_syncOffset = 0;
            m_timeScale = 1.0;
            m_timeScaleObjectBase = null;
            m_timeScaleObjectRef = null;
            m_parametersChanged = false;
            m_subtitleCleared = true;
        }

        var onSRTDataLoaded = function(srt, name)
        {
            m_localStorageKey = name;

            console.log("Loaded SRT data");

            var lines = srt.split('\n');
            for (var i = 0 ; i < lines.length ; i++)
                lines[i] = jQuery_2_1_0_for_vex.trim(lines[i]);

            var currentGroup = [ ];
            var lineGroups = [ ];
            for (var i = 0 ; i < lines.length ; i++)
            {
                if (lines[i].length == 0)
                {
                    if (currentGroup.length > 0)
                    {
                        lineGroups.push(currentGroup);
                        currentGroup = [ ];
                    }
                }
                else
                    currentGroup.push(lines[i]);
            }

            if (currentGroup.length > 0)
                lineGroups.push(currentGroup);

            m_subtitles = [ ];
            var count = 0;
            for (var g = 0 ; g < lineGroups.length ; g++)
            {
                try // just to make sure that some unforeseen error doesn't mess everything up
                {
                    var group = lineGroups[g];
                    if (group.length > 2)
                    {
                        var number = parseInt(group[0]);
                        if (isNaN(number))
                        {
                            //console.log("Bad number in: \n" + group.join("\n"));
                            continue; // bad line, ignore
                        }

                        var subTimes = group[1].split('-->');
                        if (length.subTimes < 2)
                        {
                            //console.log("Bad timing delimiter: \n" + group.join("\n"));
                            continue; // bad line, ignore
                        }

                        var startTimeStr = jQuery_2_1_0_for_vex.trim(subTimes[0]);
                        var endTimeStr = jQuery_2_1_0_for_vex.trim(subTimes[1]);

                        if (startTimeStr.length == 0 || endTimeStr.length == 0)
                        {
                            //console.log("Bad time string in: \n" + group.join("\n"));
                            continue; // bad line, ignore
                        }

                        var startTime = toSeconds(startTimeStr);
                        var endTime = toSeconds(endTimeStr);

                        if (isNaN(startTime) || isNaN(endTime))
                        {
                            //console.log("Bad time number: \n" + group.join("\n"));
                            continue; // bad line, ignore
                        }

                        var subTitleText = group[2];

                        for (var i = 3 ; i < group.length ; i++)
                            subTitleText += "\n" + group[i];

                        m_subtitles[number] = { subStart: startTime, subEnd: endTime, subText: subTitleText };
                        count++;
                    }
                }
                catch(e)
                {
                }
            }

    //        console.log(m_subtitles);

            showMessage("Loaded " + count + " subtitles");

            clearSubtitleSettings();
            loadSavedParameters();

            saveSubtitleCache();
        }

        var startsWith = function(s, start, caseInsensitive)
        {
            if (caseInsensitive)
            {
                if (s.substr(0, start.length).toLowerCase() == start.toLowerCase())
                    return true;
            }
            else
            {
                if (s.substr(0, start.length) == start)
                    return true;
            }
            return false;
        }

        var endsWith = function(s, end, caseInsensitive)
        {
            var startIdx = s.length - end.length;
            if (startIdx < 0)
                return false;

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

        var onSRTFileSelected = function(evt)
        {
            vex.close(m_generalOpenDlg.data().vex.id);
            m_generalOpenDlg = null;

            try
            {
                var files = null;

                try 
                { 
                    files = evt.srcElement.files; 
                } 
                catch(e) 
                {
                    files = evt.target.files;
                }

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
            var $ = jQuery_2_1_0_for_vex;

            m_generalOpenDlg = vex.dialog.open(
            {   
                contentCSS: { width: "60%" },
                message: [ '<h2>Load SRT subtitle file</h2>',
                    '<ul>',
                    '<li>Load a local SRT file: <input id="sublimeloadfile" type="file"></li>',
                    '<li id="sublimeloadcachedsrtlistitem">Load last used SRT file from cache: <button id="sublimeloadcachedsrt">Load</button> <span id="sublimeloadcachedsrtfilename"></span></li>',
                    '</ul>'
                             ].join("\n"),
                buttons: [ vex.dialog.buttons.NO ],
                afterOpen: function()
                {
                    var elem = document.getElementById("sublimeloadfile");
                    elem.onchange = onSRTFileSelected;

                    elem = document.getElementById("sublimeloadcachedsrt");
                    elem.onclick = function()
                    {
                        try
                        {
                            if (!(m_localStorageCacheKey in localStorage))
                                throw "No cached subtitles found";

                            loadSubtitleCache();
                            setTimeout(function() { vex.close(m_generalOpenDlg.data().vex.id); }, 0);
                        }
                        catch(err)
                        {
                            vex.dialog.alert("Error: " + textToHTML(err));
                        }
                        return false;
                    }

                    try
                    {
                        if (!(m_localStorageCacheKey in localStorage))
                            throw "m_localStorageCacheKey not found in localStorage";

                        var obj = JSON.parse(localStorage[m_localStorageCacheKey]);
                        var name = obj.storagekey;

                        if (!startsWith(name, "file://"))
                            throw "Expected storagekey to start with file://";

                        var fileName = name.substr(7);

                        elem = document.getElementById("sublimeloadcachedsrtfilename");
                        elem.innerHTML = textToHTML(fileName);
                    }
                    catch(e) // If anything goes wrong, we'll just hide that list item
                    {
                        console.log(e);
                        $("#sublimeloadcachedsrtlistitem").hide();
                    }
                }
            });
        }

        var rgbToHex = function(rgb)
        {
            console.log(rgb);

            var idx1 = rgb.indexOf("(");
            if (idx1 < 0)
                return "#000000";
            var idx2 = rgb.indexOf(")", idx1);
            if (idx2 < 0)
                return "#000000";
            var s = rgb.substr(idx1+1, idx2-idx1-1).split(",");
            if (s.length != 3)
                return "#000000";

            var ret = "#";
            for (var i = 0 ; i  < s.length ; i++)
            {
                var x = s[i];
                var y = parseInt(x).toString(16);
                if (y.length < 2)
                    y = "0" + y;
                ret += y;
            }
            return ret;
        }

        var m_localStoragePrefKey = "SubLimePreferences"; 
        var m_localStorageCacheKey = "SubLimeLastSub";

        var loadPreferences = function()
        {
            var $ = jQuery_2_1_0_for_vex;
            if (m_localStoragePrefKey in localStorage)
            {
                var preferences = JSON.parse(localStorage[m_localStoragePrefKey]);
                try { $(m_subtitleDiv).css("font-size", "" + preferences.subSize + "px"); } catch(e) { }
                try { $(m_messageDiv).css("font-size", "" + preferences.msgSize + "px"); } catch(e) { }
                try { $(m_subtitleDiv).css("color", preferences.textCol); } catch(e) { }
                try { $(m_messageDiv).css("color", preferences.textCol); } catch(e) { }
                try { m_keyOpenFile = preferences.keyinfo["open"]; } catch(e) { }
                try { m_keyDownAdjust = preferences.keyinfo["delaydown"]; } catch(e) { }
                try { m_keyUpAdjust = preferences.keyinfo["delayup"]; } catch(e) { }
                try { m_keyAbsoluteSync = preferences.keyinfo["offset"]; } catch(e) { }
                try { m_keyAbsoluteScale = preferences.keyinfo["scale"]; } catch(e) { }
                try { m_keySyncPos1 = preferences.keyinfo["autostart"]; } catch(e) { }
                try { m_keySyncPos2 = preferences.keyinfo["autoend"]; } catch(e) { }
                try { m_keySaveSubtitles = preferences.keyinfo["save"]; } catch(e) { }
                try { m_keyFullscreen = preferences.keyinfo["fullscreen"]; } catch(e) { }
                try { m_loadCachedSubtitleOnStart = preferences.loadCachedSubtitles; } catch(e) { }

                if (m_keyOpenFile === undefined) m_keyOpenFile = m_keyOpenFileDefault;
                if (m_keyDownAdjust === undefined) m_keyDownAdjust = m_keyDownAdjustDefault;
                if (m_keyUpAdjust === undefined) m_keyUpAdjust = m_keyUpAdjustDefault;
                if (m_keyAbsoluteSync === undefined) m_keyAbsoluteSync = m_keyAbsoluteSyncDefault;
                if (m_keyAbsoluteScale === undefined) m_keyAbsoluteScale = m_keyAbsoluteScaleDefault;
                if (m_keySyncPos1 === undefined) m_keySyncPos1 = m_keySyncPos1Default;
                if (m_keySyncPos2 === undefined) m_keySyncPos2 = m_keySyncPos2Default;
                if (m_keySaveSubtitles === undefined) m_keySaveSubtitles = m_keySaveSubtitlesDefault;
                if (m_keyFullscreen === undefined) m_keyFullscreen = m_keyFullscreenDefault;
            }
        }

        var savePreferences = function()
        {
            var $ = jQuery_2_1_0_for_vex;
            var preferences = { 
                subSize: parseInt($(m_subtitleDiv).css("font-size")),
                msgSize: parseInt($(m_messageDiv).css("font-size")),
                textCol: rgbToHex(getComputedStyle(m_subtitleDiv).color),
                keyinfo:
                {
                    "open": m_keyOpenFile,
                    "delaydown": m_keyDownAdjust,
                    "delayup": m_keyUpAdjust,
                    "offset": m_keyAbsoluteSync,
                    "scale": m_keyAbsoluteScale,
                    "autostart": m_keySyncPos1,
                    "autoend": m_keySyncPos2,
                    "save": m_keySaveSubtitles,
                    "fullscreen": m_keyFullscreen
                },
                loadCachedSubtitles: m_loadCachedSubtitleOnStart
            }

            localStorage[m_localStoragePrefKey] = JSON.stringify(preferences);
        }

        var saveSubtitleCache = function()
        {
            if (m_localStorageKey.length == 0 || m_subtitles.length == 0)
                return;

            var cacheObj = 
            { 
                "storagekey": m_localStorageKey,
                "subtitles": m_subtitles
            }

            localStorage[m_localStorageCacheKey] = JSON.stringify(cacheObj);
        }

        var loadSubtitleCache = function()
        {
            if (!(m_localStorageCacheKey in localStorage))
                throw "No cached subtitles found";

            var cacheObj = JSON.parse(localStorage[m_localStorageCacheKey]);
            
            m_localStorageKey = cacheObj["storagekey"];
            m_subtitles = cacheObj["subtitles"];
    
            clearSubtitleSettings();
            loadSavedParameters();
        }

        var grabKey = function(handler)
        {
            var oldKbdDown = document.onkeydown;
            var oldKbdUp = document.onkeyup;
            var oldKbdPress = document.onkeypress;

            var dlgId = vex.dialog.open({
                message: '<h2>Press the key you wish to use...</h2>',
                buttons: [ vex.dialog.buttons.NO ],

                afterOpen: function()
                {
                    document.onkeydown = null;
                    document.onkeyup = null;

                    document.onkeypress = function(evt)
                    {
                        if (evt.charCode == 0)
                            return;
                        
                        var c = String.fromCharCode(evt.charCode);

                        dlgId.data().vex.value = c;
                        vex.close(dlgId.data().vex.id);
                    }
                },
                callback: function(data) 
                {
                    document.onkeydown = oldKbdDown;
                    document.onkeyup = oldKbdUp;
                    document.onkeypress = oldKbdPress;

                    if (data === false) 
                    {
                        setTimeout(function() { handler(false); }, 0);
                        return;
                    }

                    setTimeout(function() { handler(data); }, 0);
                }
            });
        }

        var changeKeyBindings = function(keyInfoStart)
        {
            var $ = jQuery_2_1_0_for_vex;
            var htmlInput = [ '',
                '<table border="0" width="100%" id="sublimekeybindings">',
                '</table>',
                ''].join('\n');

            var keyInfo = copyObject(keyInfoStart);

            function showKeys(elem, infoName)
            {
                var keys = keyInfo[infoName];
                if (keys.length == 0)
                    elem.innerHTML = "(not bound)";
                else
                {
                    var s = "'" + keys[0] + "'";
                    for (var i = 1 ; i < keys.length ; i++)
                    {
                        s += ",'";
                        s += keys[i];
                        s += "'";
                    }

                    elem.innerHTML = s;
                }
            }

            function getGrabFunction(elem, infoName)
            {
                return function()
                {
                    var grabDlg = grabKey(function(key)
                    {
                        if (key === false)
                            return;

                        for (var n in keyInfo)
                        {
                            if (inList(keyInfo[n], key))
                            {
                                vex.dialog.alert("Key is already in use");
                                return;
                            }
                        }
                
                        keyInfo[infoName].push(key);
                        showKeys(elem, infoName);
                    });

                    return false;
                }
            }

            function getClearFunction(elem, infoName)
            {
                return function()
                {
                    keyInfo[infoName] = [ ];    
                    showKeys(elem, infoName);

                    return false;
                }
            }

            vex.dialog.open({
                contentCSS: { width: "70%" },
                message: '<h2>Key bindings</h2>',
                input: htmlInput,
                buttons: [
                   {
                    text: 'OK',
                    type: 'submit',
                    className: 'vex-dialog-button-primary'
                  },
                  {
                    text: 'Cancel',
                    type: 'button',
                    className: 'vex-dialog-button-secondary',
                    click: function($vexContent, event) {
                      $vexContent.data().vex.value = false;
                      return vex.close($vexContent.data().vex.id);
                    }
                  },
                  {
                      text: 'Set defaults',
                      type: 'button',
                      className: 'vex-dialog-button-secondary',
                      click:  function($vexContent, event)
                      {
                          keyInfo["open"] = copyObject(m_keyOpenFileDefault);
                          keyInfo["delayup"] = copyObject(m_keyUpAdjustDefault);
                          keyInfo["delaydown"] = copyObject(m_keyDownAdjustDefault);
                          keyInfo["offset"] = copyObject(m_keyAbsoluteSyncDefault);
                          keyInfo["scale"] = copyObject(m_keyAbsoluteScaleDefault);
                          keyInfo["autostart"] = copyObject(m_keySyncPos1Default);
                          keyInfo["autoend"] = copyObject(m_keySyncPos2Default);
                          keyInfo["save"] = copyObject(m_keySaveSubtitlesDefault);
                          keyInfo["fullscreen"] = copyObject(m_keyFullscreenDefault);
                          
                          $vexContent.data().vex.value = true;
                          return vex.close($vexContent.data().vex.id);
                      }
                  }
                ],

                afterOpen: function()
                {
                    var table = document.getElementById("sublimekeybindings");
                    var bindings = 
                    [
                        { text: "Open&nbsp;file:", infoName: "open" },
                        { text: "Decrease&nbsp;offset:", infoName: "delaydown" },
                        { text: "Increase&nbsp;offset:", infoName: "delayup" },
                        { text: "Set&nbsp;offset:", infoName: "offset" },
                        { text: "Set&nbsp;scale:", infoName: "scale" },
                        { text: "Set&nbsp;sync&nbsp;pos&nbsp;1:", infoName: "autostart" },
                        { text: "Set&nbsp;sync&nbsp;pos&nbsp;2:", infoName: "autoend" },
                        { text: "Save&nbsp;subtitles:", infoName: "save" },
                        { text: "Full&nbsp;screen:", infoName: "fullscreen" },
                    ];

                    for (var i = 0 ; i < bindings.length ; i++)
                    {
                        var b = bindings[i];
                        var tr = document.createElement("tr");
                        var td = document.createElement("td");
                        $(td).css("padding-right", "5px");
                        td.innerHTML = b.text;
                        tr.appendChild(td);

                        var tdKeys = document.createElement("td");
                        showKeys(tdKeys, b.infoName);
                        tdKeys.setAttribute("width", "100%");
                        tr.appendChild(tdKeys);

                        td = document.createElement("td");
                        var button = document.createElement("button");
                        button.innerHTML = "Grab&nbsp;key";
                        button.onclick = getGrabFunction(tdKeys, b.infoName);
                        button.className = "vex-dialog-buttons vex-dialog-button vex-dialog-button-secondary";
                        td.appendChild(button);
                        tr.appendChild(td);

                        td = document.createElement("td");
                        button = document.createElement("button");
                        button.innerHTML = "Clear";
                        button.onclick = getClearFunction(tdKeys, b.infoName);
                        button.className = "vex-dialog-buttons vex-dialog-button vex-dialog-button-secondary";
                        td.appendChild(button);
                        tr.appendChild(td);

                        table.appendChild(tr);
                    }
                },
                callback: function(data) 
                {
                    if (data === false)
                        return;

                    // Change the members of the original struct
                    for (var n in keyInfoStart)
                        keyInfoStart[n] = keyInfo[n];
                }
            });
        }

        var setPreferences = function()
        {        
            var originalTextCol = rgbToHex(getComputedStyle(m_subtitleDiv).color);
            var htmlInput = [ '',
                '<table border="0" width="100%">',
                '<tr>',
                '<td style="padding-right:5px;">',
                'Subtitle&nbsp;font&nbsp;size:</td><td style="padding-right:5px;" id="sublimesubtitlefontsizetext">Subtitle&nbsp;text',
                '</td>',
                '<td width="100%" style="padding-right:5px;">',
                '<input id="sublimesubtitlefontsize" name="sublimesubtitlefontsize" type="number" min="1" max="100"/>',
                '</td>',
                '</tr>',
                '<tr>',
                '<td style="padding-right:5px;">',
                'Messages&nbsp;font&nbsp;size:</td><td style="padding-right:5px;" id="sublimemessagesfontsizetext">Message&nbsp;text',
                '</td>',
                '<td style="padding-right:5px;">',
                '<input id="sublimemessagesfontsize" name="sublimemessagesfontsize" type="number" min="1" max="100"/>',
                '</td>',
                '</tr>',
                '<tr>',
                '<td colspan="2" style="padding-right:5px;">',
                'Distance&nbsp;from&nbsp;bottom&nbsp;of&nbsp;the&nbsp;video&nbsp;(in&nbsp;pixels):',
                '</td>',
                '<td style="padding-right:5px;">',
                '<input id="sublimesubtitledistance" name="sublimesubtitledistance" type="number" min="0" max="4096"/>',
                '</td>',
                '</tr>',
                '<tr>',
                '<td colspan="2" style="padding-right:5px;">',
                'Text&nbsp;color:',
                '</td>',
                '<td style="padding-right:5px;">',
                '<input id="sublimetextcolor" name="sublimetextcolor" type="color" value="' + originalTextCol + '"/>',
                '</td>',
                '</tr>',
                '<tr>',
                '<td colspan="2" style="padding-right:5px;">',
                'Automatically&nbsp;load&nbsp;last&nbsp;subtitles&nbsp;on&nbsp;start:',
                '</td>',
                '<td style="padding-right:5px;">',
                '<input type="checkbox" id="sublimeautoreload" value="Yes"/>',
                '</td>',
                '</tr>',
                '</table>',
                ''].join('\n');
            var $ = jQuery_2_1_0_for_vex;

            var transferStyles = function(dst, src, elems)
            {
                for (var i = 0 ; i < elems.length ; i++)
                {
                    var n = elems[i];
                    var srcVal = $(src).css(n);
                    $(dst).css(n, srcVal);
                }
            }

            var originalSubSize = -1;
            var originalMsgSize = -1;
            var originalDistance = -1;
            var originalKeyInfo = copyObject(
            {
                "open": m_keyOpenFile,
                "delaydown": m_keyDownAdjust,
                "delayup": m_keyUpAdjust,
                "offset": m_keyAbsoluteSync,
                "scale": m_keyAbsoluteScale,
                "autostart": m_keySyncPos1,
                "autoend": m_keySyncPos2,
                "save": m_keySaveSubtitles,
                "fullscreen": m_keyFullscreen
            });
            var newKeyInfo = copyObject(originalKeyInfo);

            vex.dialog.open({
                contentCSS: { width: "90%", "background-color": "rgba(255,255,255,0.5)" },
                message: '<h2>SubLime preferences</h2>',
                input: htmlInput,
                buttons: [
                   {
                    text: 'OK',
                    type: 'submit',
                    className: 'vex-dialog-button-primary'
                  },
                  {
                    text: 'Cancel',
                    type: 'button',
                    className: 'vex-dialog-button-secondary',
                    click: function($vexContent, event) {
                      $vexContent.data().vex.value = false;
                      return vex.close($vexContent.data().vex.id);
                    }
                  },
                  {
                      text: 'Change key bindings',
                      type: 'button',
                      className: 'vex-dialog-button-secondary',
                      click:  function($vexContent, event)
                      {
                          changeKeyBindings(newKeyInfo); // changes the contents of newKeyInfo
                      }
                  }
                ],

                afterOpen: function()
                {
                    console.log("afterOpen");

                    var subElem = document.getElementById("sublimesubtitlefontsizetext");
                    var msgElem = document.getElementById("sublimemessagesfontsizetext");
                    
                    transferStyles(subElem, m_subtitleDiv, [ "font-family", "font-weight", "color", "text-shadow", "font-size" ]);
                    transferStyles(msgElem, m_messageDiv, [ "font-family", "font-weight", "color", "text-shadow", "font-size" ]);
                    var subSize = parseInt($(subElem).css("font-size"));
                    var msgSize = parseInt($(msgElem).css("font-size"));

                    originalSubSize = subSize;
                    originalMsgSize = msgSize;

                    var subElemNum = document.getElementById("sublimesubtitlefontsize");
                    var msgElemNum = document.getElementById("sublimemessagesfontsize");

                    subElemNum.setAttribute("value", subSize);
                    msgElemNum.setAttribute("value", msgSize);

                    function limitNumber(val, minVal, maxVal)
                    {
                        if (val < minVal)
                            return minVal;
                        if (val > maxVal)
                            return maxVal;
                        return val;
                    }

                    function getNumChangeFunction(numElem, txtElem, divElem)
                    {
                        return function()
                        {
                            var val = limitNumber(parseInt(numElem.value),1,100);
                            $(txtElem).css("font-size", "" + val + "px");
                            $(divElem).css("font-size", "" + val + "px");
                        }
                    }

                    subElemNum.onchange = getNumChangeFunction(subElemNum, subElem, m_subtitleDiv);
                    msgElemNum.onchange = getNumChangeFunction(msgElemNum, msgElem, m_messageDiv);

                    var dist = parseInt($(m_subtitleDiv).css("bottom"));
                    var distElemNum = document.getElementById("sublimesubtitledistance");

                    originalDistance = dist;
                    
                    distElemNum.setAttribute("value", dist);
                    distElemNum.onchange = function()
                    {
                        var val = limitNumber(parseInt(distElemNum.value), 1, 100);
                        $(m_subtitleDiv).css("bottom", "" + val + "px");
                    }

                    var colElem = document.getElementById("sublimetextcolor");
                    colElem.onchange = function()
                    {
                        var val = colElem.value;
                        $(subElem).css("color", val);
                        $(msgElem).css("color", val);
                        $(m_subtitleDiv).css("color", val);
                        $(m_messageDiv).css("color", val);
                    }

                    m_usingTestSubtitle = true;
                    setSubTitleText("Test subtitle");

                    if (m_messageTimer)
                    {
                        clearTimeout(m_messageTimer);
                        m_messageTimer = null;
                    }
                    setMessageText("Test message");

                    var reloadElem = document.getElementById("sublimeautoreload");
                    $(reloadElem).prop('checked', m_loadCachedSubtitleOnStart);
                },
                callback: function(data) 
                {
                    m_usingTestSubtitle = false;
                    m_lastShownSubIdx = -1; // This will make the callback look for the subtitle again
                    setSubTitleText("");
                    setMessageText("");

                    if (data === false) 
                    {
                        console.log("Cancelled");
                        $(m_subtitleDiv).css("font-size", "" + originalSubSize + "px");
                        $(m_messageDiv).css("font-size", "" + originalMsgSize + "px");
                        $(m_subtitleDiv).css("bottom", "" + originalDistance + "px");
                        $(m_subtitleDiv).css("color", originalTextCol);
                        $(m_messageDiv).css("color", originalTextCol);

                        // New keyboard handlers havent been installed yet, so they are
                        // automatically discarded

                        return;
                    }
                    console.log("Accepted");

                    var subElemNum = document.getElementById("sublimesubtitlefontsize");
                    var msgElemNum = document.getElementById("sublimemessagesfontsize");
                    var distElemNum = document.getElementById("sublimesubtitledistance");
                    var colElem = document.getElementById("sublimetextcolor");

                    $(m_subtitleDiv).css("font-size", "" + subElemNum.value + "px");
                    $(m_messageDiv).css("font-size", "" + msgElemNum.value + "px");
                    $(m_subtitleDiv).css("bottom", "" + distElemNum.value + "px");
                    $(m_subtitleDiv).css("color", colElem.value);
                    $(m_messageDiv).css("color", colElem.value);

                    m_keyOpenFile = newKeyInfo["open"];
                    m_keyDownAdjust = newKeyInfo["delaydown"];
                    m_keyUpAdjust = newKeyInfo["delayup"];
                    m_keyAbsoluteSync = newKeyInfo["offset"];
                    m_keyAbsoluteScale = newKeyInfo["scale"];
                    m_keySyncPos1 = newKeyInfo["autostart"];
                    m_keySyncPos2 = newKeyInfo["autoend"];
                    m_keySaveSubtitles = newKeyInfo["save"];
                    m_keyFullscreen = newKeyInfo["fullscreen"];

                    var reloadElem = document.getElementById("sublimeautoreload");
                    if ($(reloadElem).prop('checked'))
                        m_loadCachedSubtitleOnStart = true;
                    else
                        m_loadCachedSubtitleOnStart = false;

                    savePreferences();
                }
            });
        }

        var goFullScreen = function()
        {
            if (m_fullScreen) // already full screen
                return;

            if (!m_glHelper)
            {
                vex.dialog.alert("Unable to start SubLime fullscreen mode:\nWebGL helper could not be initialized");
                return;
            }


            if (m_fullScreenDiv.requestFullscreen)
                m_fullScreenDiv.requestFullscreen();
            else if (m_fullScreenDiv.msRequestFullscreen)
                m_fullScreenDiv.msRequestFullscreen();
            else if (m_fullScreenDiv.mozRequestFullScreen)
                m_fullScreenDiv.mozRequestFullScreen();
            else if (m_fullScreenDiv.webkitRequestFullscreen)
                m_fullScreenDiv.webkitRequestFullscreen();
            else
            {
                vex.dialog.alert("Your browser does not seem to support full screen requests");
                return;
            }

            m_fullScreenCanvas.style.display = "";
            m_fullScreenCanvas.width = 4;
            m_fullScreenCanvas.height = 4;
        }

        var onFullScreenChange = function(evt)
        {
            console.log("onFullScreenChange");
            
            var elem = document.fullScreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
            if (!elem) 
            {
                // We've left full screen mode
                m_fullScreen = false;
                m_fullScreenCanvas.style.display = "none";
                if (m_fullScreenUpdateTimer)
                {
                    cancelAnimationFrame(m_fullScreenUpdateTimer);
                    m_fullScreenUpdateTimer = null;
                    console.log("Stopped update loop");
                }
                return;
            }

            if (elem !== m_fullScreenDiv) // make sure it's our own canvas that is full screen
                return;

            // We've entered full screen mode
            m_fullScreen = true;

            m_fullScreenCanvas.width = screen.width;
            m_fullScreenCanvas.height = screen.height;
            
            if (m_fullScreenUpdateTimer)
                return;

            var screenUpdate = function()
            {
                if (m_video)
                {
                    var w = screen.width;
                    var h = Math.round(w*(m_video.videoHeight/m_video.videoWidth));

                    if (h > screen.height)
                    {
                        h = screen.height;
                        w = Math.round(h*(m_video.videoWidth/m_video.videoHeight));
                    }

                    m_fullScreenCanvas.width = w;
                    m_fullScreenCanvas.height = h;

                    m_glHelper.setVideoTexture(m_video);
                }

                m_fullScreenUpdateTimer = requestAnimationFrame(screenUpdate);
            }

            m_fullScreenUpdateTimer = requestAnimationFrame(screenUpdate);
            console.log("Started update loop");
        }

        var inList = function(l, elem)
        {
            var n = l.length;

            for (var i = 0 ; i < n ; i++)
            {
                if (l[i] == elem)
                    return true;
            }
            return false;
        }

        var newKeyUpHandler = function(evt)
        {
            if (!m_inDialog)
            {
                if (evt.altKey && evt.keyCode == m_keyPreferences)
                    setPreferences();
            }

            if (m_oldKbdFunctionUp)
                m_oldKbdFunctionUp(evt);
        }

        var newKeyPressHandler = function(evt)
        {
            console.log(evt);
            if (!m_inDialog && evt.charCode > 0)
            {
                var keyChar = String.fromCharCode(evt.charCode);

                if (inList(m_keyOpenFile, keyChar))
                    openSRTFile();
                else if (inList(m_keyDownAdjust, keyChar))
                    syncAdjust(-0.100, false);
                else if (inList(m_keyUpAdjust, keyChar))
                    syncAdjust(+0.100, false);
                else if (inList(m_keyAbsoluteSync, keyChar))
                    getAbsoluteSync();
                else if (inList(m_keyAbsoluteScale, keyChar))
                    getTimeScale();
                else if (inList(m_keySyncPos1, keyChar))
                    setTimeScalePosition(true);
                else if (inList(m_keySyncPos2, keyChar))
                    setTimeScalePosition(false);
                else if (inList(m_keySaveSubtitles, keyChar))
                    saveSyncAdjustedSubtitles();
                else if (inList(m_keyFullscreen, keyChar))
                    goFullScreen();
            }

            if (m_oldKbdFunctionPress)
                m_oldKbdFunctionPress(evt);
        }

        var addButtonStyle = function()
        {
            // We'll use an iframe to get the default button style

            var $ = jQuery_2_1_0_for_vex;
            var iframe = document.createElement("iframe");
            document.body.appendChild(iframe);

            setTimeout(function()
            {
                var doc = iframe.contentWindow.document;
                var btn = document.createElement("button");
                doc.body.appendChild(btn);

                var props = { "border": null, "padding": null, "background": null };
            
                for (var prop in props)
                {
                    var val = $(btn).css(prop);
                    props[prop] = val;
                }
                console.log(props);

                document.body.removeChild(iframe);

                // Obtained the default settings, now add a style element
                var s = ".sublimedlgbaseclass button { "
                for (var prop in props)
                    s += prop + ": " + props[prop] + ";\n";
                s += "}\n";

                var elem = document.createElement("style");
                elem.innerHTML = s;
                document.head.appendChild(elem);
            }, 0);
        }

        var resourcesInitialized = function()
        {
            console.log("Resources m_initialized");

            addButtonStyle();

            vex.defaultOptions.className = 'vex-theme-wireframe sublimedlgbaseclass';
            vex.defaultOptions.beforeOpen = function($vexContent, options) { options.origInDialog = m_inDialog; m_inDialog = true; }
            vex.defaultOptions.afterClose = function($vexContent, options) { m_inDialog = options.origInDialog; };
            
            m_initializing = false;
            m_initialized = true;

            m_oldKbdFunctionUp = document.onkeyup;
            document.onkeyup = newKeyUpHandler;

            m_oldKbdFunctionPress = document.onkeypress;
            document.onkeypress = newKeyPressHandler;

            setInterval(function() { onCheckSubtitleTimeout(); }, 200);
            setInterval(function() { onCheckSaveParametersTimeout(); }, 1000);
            setInterval(function() { onCheckVideoSizeTimeout(); }, 1000);

            // These will get downloaded when the rest is finished, to make sure the app doesn't
            // wait for them
            var extraResources = [
                            //{ type: "link", url: "//fonts.googleapis.com/css?family=Open+Sans:800,700,400,600,300" }
                            { type: "link", url: "//fonts.googleapis.com/css?family=Titillium+Web:900,700,700italic" }
                          ];
            processResource(0, extraResources);

            // Create the elements for showing the subtitles and the messages
            m_overlayDiv = document.createElement("div");
            m_overlayDiv.classList.add("sublimedivbase");
            if ("innerText" in m_overlayDiv)
                m_haveInnerText = true;

            m_subtitleDiv = document.createElement("div");
            m_subtitleDiv.classList.add("sublimedivbase");
            m_subtitleDiv.classList.add("sublimesubtitle");

            m_messageDiv = document.createElement("div");
            m_messageDiv.classList.add("sublimedivbase");
            m_messageDiv.classList.add("sublimemessage");

            document.body.appendChild(m_overlayDiv);
            m_overlayDiv.appendChild(m_subtitleDiv);
            m_overlayDiv.appendChild(m_messageDiv);
            setSubTitleText("");
            setMessageText("");

            m_fullScreenCanvas = document.createElement("canvas");
            try { m_glHelper = new GLHelper(m_fullScreenCanvas); console.log("GLHelper initialized"); } catch(e) { m_fullScreenCanvas = null; console.log("Unable to init GLHelper: " + e); }

            if (m_glHelper)
            {
                m_fullScreenCanvas.style.display = "none";
             
                m_fullScreenDiv2 = document.createElement("div");
                m_fullScreenDiv2.appendChild(m_fullScreenCanvas);
                m_fullScreenDiv2.appendChild(m_overlayDiv);

                m_fullScreenDiv = document.createElement("div");
                m_fullScreenDiv.appendChild(m_fullScreenDiv2);

                document.body.appendChild(m_fullScreenDiv);
                jQuery_2_1_0_for_vex(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', onFullScreenChange);

                vex.defaultOptions.appendLocation = m_fullScreenDiv;
            }

            loadPreferences();

            var openSRTdialog = false;

            if (m_loadCachedSubtitleOnStart && (m_localStorageCacheKey in localStorage))
            {
                try 
                { 
                    loadSubtitleCache(); 
                    var fileName = m_localStorageKey; // This is set by loadSubtitleCache()
                    if (startsWith(fileName,"file://"))
                        fileName = fileName.substr(7);

                    var autoDlg = vex.dialog.open(
                    {
                        contentCSS: { width: "60%" },
                        message: 'Loaded: ' + textToHTML(fileName),
                        buttons: [ ]
                    });
                    setTimeout(function() { try { vex.close(autoDlg.data().vex.id); } catch(e) { } }, 2000);
                } 
                catch(e) 
                { 
                }
            }
            else
                openSRTdialog = true;

            if (openSRTdialog)
            {
                // Just open the 'open' dialog
                setTimeout(function() { openSRTFile(); }, 0 );
            }

            // Make sure 'run' is executed again, now that everything
            // is initialized
            setTimeout(function() { _this.run(); }, 0);
        }

        var createLoadCallback = function(idx, res, finalCallback)
        {
            return function()
            {
                console.log(res[idx].url + " loaded");

                if (idx+1 == res.length)
                {
                    if (finalCallback)
                        finalCallback();
                }
                else
                    processResource(idx+1, res, finalCallback);
            }
        }

        var processResource = function(idx, res, finalCallback)
        {
            var obj = res[idx];

            if (obj.type == "link")
            {
                var s = document.createElement("link");
                
                s.setAttribute("rel", "stylesheet");
                s.setAttribute("href", obj.url);
                s.onload = createLoadCallback(idx, res, finalCallback);

                console.log("Loading: " + obj.url);

                document.head.appendChild(s);
            }
            else if (obj.type == "script")
            {
                var s = document.createElement("script");
         
                if (obj.contents) // just some code we want to execute, not a file
                {
                    s.innerHTML = obj.contents;
                    setTimeout(createLoadCallback(idx, res, finalCallback), 0);
                }
                else
                {
                    s.src = obj.url;
                    s.onload = createLoadCallback(idx, res, finalCallback);
                }
                document.body.appendChild(s);
            }
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

            processResource(0, resources, resourcesInitialized); // start resource retrieval, can't start before these are in
        }

        this.run = function()
        {
            console.log("run");

            if (m_initializing)
                return;

            if (!m_initialized)
            {
                m_initializing = true;
                init();
                return;
            }

            var videoElements = document.getElementsByTagName("video");
            if (videoElements.length < 1)
            {
                if (m_generalOpenDlg != null)
                {
                    vex.close(m_generalOpenDlg.data().vex.id);
                    m_generalOpenDlg = null;
                }
                vex.dialog.alert("No video element found on this page");
                return;
            }

            if (m_video == null)
                m_video = videoElements[0];
            else
            {
                var found = false;
                for (var i = 0 ; !found && i < videoElements.length ; i++)
                {
                    if (m_video == videoElements[i])
                    {
                        var newPos = (i+1)%videoElements.length;
                        m_video = videoElements[newPos];
                        found = true;
                    }
                }

                if (!found)
                    m_video = videoElements[0];
            }
        
            onCheckVideoSizeTimeout(); // set the initial position for the overlay div
        }
    }

    return function(baseUrl)
    {
        if (!instance)
        {
            instance = new SubLimeLet(baseUrl);
            console.log("Allocated new instance");
        }
        instance.run();
    }
})();

// For backward compatibility
var SubLimeLet = { }
SubLimeLet.run = SubLimeLetRun;
