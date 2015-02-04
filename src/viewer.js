var jQuery_2_1_0_for_vex = jQuery.noConflict(true);
var videoPosTimer = null;

function textToHTML(text)
{
    return ((text || "") + "")  // make sure it's a string;
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\t/g, "    ")
        .replace(/ /g, "&#8203; &#8203;")
        .replace(/\r\n|\r|\n/g, "<br />");
}

function startsWith(s, start, caseInsensitive)
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

function endsWith(s, end, caseInsensitive)
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

function validateFileName(name)
{
    if (!endsWith(name, ".mp4", true) && !endsWith(name, ".webm") && !endsWith(name, ".m4v"))
        throw "Filename does not end with '.mp4', '.m4v' or '.webm'";
}

function gotoLastKnownVideoPosition(name)
{
    try
    {
        var videoInfo = JSON.parse(localStorage[name]);
        var newPos = videoInfo["position"];

        newPos -= 20.0; // go back 20 secs
        if (newPos < 0)
            newPos = 0;

        console.log("Setting video time to " + newPos);
        videoElem.currentTime = newPos;

    }
    catch(e)
    {
        console.log("gotoLastKnownVideoPosition: " + e);
    }
}

function restoreGainSetting(name)
{
    try
    {
        var videoInfo = JSON.parse(localStorage[name]);
        var g = videoInfo["gain"];

        console.log("Setting gain to " + g);
        gainNode.gain.value = g;
    }
    catch(e)
    {
        console.log("restoreGainSetting: " + e);
    }
}

function onVideoSelected(file)
{
    videoElem.src = URL.createObjectURL(file);
    videoElem.firstPlay = true;
    if (videoPosTimer)
    {
        clearInterval(videoPosTimer);
        videoPosTimer = null;
    }

    videoElem.oncanplay = function() 
    { 
        if (!videoElem.firstPlay)
            return;

        videoElem.firstPlay = false;

        // Set seek bar props
	    var seekBar = document.getElementById("seek-bar");
        seekBar.setAttribute("min", 1);

        var numSecs = Math.round(videoElem.duration);
        var maxVal = 60*60*24;
        if (numSecs < maxVal)
            maxVal = numSecs;
        seekBar.setAttribute("max", maxVal);

        seekBar.setAttribute("step", 1);
        seekBar.setAttribute("value", 1);


        // Set gain to default
        gainNode.gain.value = 1;

        var identifier = SparkMD5.hash(file.name);
        var videoFileName = "video-file://" + identifier;

        gotoLastKnownVideoPosition(videoFileName);
        restoreGainSetting(videoFileName);

        var saveFunction = (function(name)
        {
            return function()
            {
                //console.log("Saving " + file.name + " settings");

                var pos = videoElem.currentTime;
                var gain = gainNode.gain.value;
                var now = Date.now();

                localStorage[name] = JSON.stringify({ "position": pos, "time": now, "gain": gain });
            }
        })(videoFileName);

        videoPosTimer = setInterval(saveFunction, 500);
        videoElem.play();
    }
}

function loadVideo(evt)
{
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

        console.log(files);
        if (files.length != 1)
            throw "Precisely one file must be selected";

        var file = files[0];

        validateFileName(file.name);
        onVideoSelected(file);
    }
    catch(err)
    {
        vex.dialog.alert("Error: " + textToHTML(err));
    }
}

function fullscreen()
{
    var elem = document.getElementById("videodiv");
    if (elem.requestFullscreen) 
        elem.requestFullscreen();
    else if (elem.msRequestFullscreen)
        elem.msRequestFullscreen();
    else if (elem.mozRequestFullScreen)
        elem.mozRequestFullScreen();
    else if (elem.webkitRequestFullscreen)
        elem.webkitRequestFullscreen();
    else
        vex.dialog.alert("Not able to request full screen, sorry");
}

var context = null;
var gainNode = null;

function setGain()
{
    vex.dialog.prompt(
    {
        message: 'Enter gain value:',
        placeholder: '' + gainNode.gain.value,
        callback: function(value) 
        {
            if (value !== false)
            {
                try
                {
                    var g = parseFloat(value);

                    if (g > 0 && g < 256.0)
                        gainNode.gain.value = g;
                }
                catch(e)
                {
                }
            }
        }
    });
}

var videoElem = null;
var videoDiv = null;
var spaceDiv = null;
var lastInteractionTime = 0;

function gotInteraction()
{
    var $ = jQuery_2_1_0_for_vex;
    lastInteractionTime = performance.now();
    $(videoElem).css("cursor", "default");
    $("#video-controls").slideDown(1000);
}

function onMouseMove(evt)
{
    gotInteraction();
}

function onTimeout()
{
    var $ = jQuery_2_1_0_for_vex;
    var now = performance.now();

    // See if we should hide the mouse
    if (now - lastInteractionTime > 3000)
    {
        $(videoElem).css("cursor", "none");
        $("#video-controls").slideUp(1000);
    }

    var w = videoElem.videoWidth;
    var h = videoElem.videoHeight;
    if (w <= 0 || h <= 0)
    {
        w = $(window).width();
        h = $(window).height();
    }

    var W = $(window).width();
    var H = Math.round(W/w*h);

    var Hmax = $(window).height();
    if (H > Hmax)
    {
        W = Math.round(H/h*w);
        H = Hmax;
    }

    videoElem.style.width = "" + W + "px";
    videoElem.style.height = "" + H + "px";
    videoDiv.style.width = "" + W + "px";
    videoDiv.style.height = "" + H + "px";

    var Hextra = Math.round((Hmax-H)/2);

    spaceDiv.style.width = "" + W + "px";
    spaceDiv.style.height = "" + Hextra + "px";

    checkPlayButton();
}

function checkPlayButton()
{
    var playing = true;

    if (videoElem.paused)
        playing = false;
    if (videoElem.ended)
        playing = false;
    if (isNaN(videoElem.duration))
        playing = false;
    
	var playButton = document.getElementById("play-pause");
    if (playing)
		playButton.innerHTML = "Pause";
    else
		playButton.innerHTML = "Play";
}

function convertToTimeString(t) // t in seconds and positive
{
    var tHours = Math.floor(t/3600);

    t -= tHours*3600;
    var tMin = Math.floor(t/60);
    var tMinStr = "" + tMin;
    if (tMinStr.length < 2)
        tMinStr = "0" + tMinStr;

    t -= tMin*60;
    var tSec = Math.floor(t);
    var tSecStr = "" + tSec;
    if (tSecStr.length < 2)
        tSecStr = "0" + tSecStr;

    return "" + tHours + ":" + tMinStr + ":" + tSecStr;
}

function updateTimeLeft()
{
    var $ = jQuery_2_1_0_for_vex;
    var t = (videoElem.duration-videoElem.currentTime);

    $("#timeleft").html("-" + convertToTimeString(t) + "/" + convertToTimeString(videoElem.duration));
}

// Custom controls from http://blog.teamtreehouse.com/building-custom-controls-for-html5-videos
function setupVideoControls()
{
	// Video
	var video = document.getElementById("video");

	// Buttons
	var playButton = document.getElementById("play-pause");
	var muteButton = document.getElementById("mute");
	var fullScreenButton = document.getElementById("full-screen");

	// Sliders
	var seekBar = document.getElementById("seek-bar");
	var volumeBar = document.getElementById("volume-bar");

	// Event listener for the play/pause button
	playButton.addEventListener("click", function() {
		if (video.paused == true) {
			// Play the video
			video.play();
            checkPlayButton();
		} else {
			// Pause the video
			video.pause();
            checkPlayButton();
		}
	});


	// Event listener for the mute button
	muteButton.addEventListener("click", function() {
		if (video.muted == false) {
			// Mute the video
			video.muted = true;

			// Update the button text
			muteButton.innerHTML = "Unmute";
		} else {
			// Unmute the video
			video.muted = false;

			// Update the button text
			muteButton.innerHTML = "Mute";
		}
	});

	// Event listener for the full-screen button
	fullScreenButton.addEventListener("click", fullscreen);

	// Event listener for the seek bar
	seekBar.addEventListener("change", function() {
		// Calculate the new time
		var time = video.duration * (seekBar.value / seekBar.max);

		// Update the video time
		video.currentTime = time;
	});

	
	// Update the seek bar as the video plays
	video.addEventListener("timeupdate", function() {
		// Calculate the slider value
		var value = (seekBar.max / video.duration) * video.currentTime;

		// Update the slider value
		seekBar.value = value;

        updateTimeLeft();
	});

	// Pause the video when the seek handle is being dragged
	seekBar.addEventListener("mousedown", function() {
		video.pause();
	});

	// Play the video when the seek handle is dropped
	seekBar.addEventListener("mouseup", function() {
		video.play();
	});

	// Event listener for the volume bar
	volumeBar.addEventListener("change", function() {
		// Update the video volume
		video.volume = volumeBar.value;
	});
}

function cleanupLocalStorage(maxEntries)
{
    var now = Date.now();
    var arr = [ ]

    for (var n in localStorage)
    {
        if (startsWith(n, "video-file://"))
        {
            try
            {
                var videoInfo = JSON.parse(localStorage[n]);
                var t = now - videoInfo["time"];

                arr.push({ "time": t, "key": n });
            }
            catch(e)
            {
                console.log("Error: " + e);
                console.log("Deleting localStorage entry " + n);
                delete localStorage[n];
            }
        }
    }

    arr.sort(function(a, b) 
    {
        if (a.time > b.time)
            return 1;
        if (a.time < b.time)
            return -1;
        return 0;
    });

    console.log(arr);

    for (var i = maxEntries ; i < arr.length ; i++)
    {
        var key = arr[i]["key"];
        console.log("Deleting localStorage entry " + key);
        delete localStorage[key];
    }
}

var subLime = null;

function onLoad()
{
    var $ = jQuery_2_1_0_for_vex;
    var elem = document.getElementById("loadfile");
    elem.onchange = loadVideo;

    videoElem = document.getElementById("video");
    videoDiv = document.getElementById("videodiv");
    spaceDiv = document.getElementById("spacediv");

    vex.defaultOptions.className = 'vex-theme-wireframe';
    vex.defaultOptions.appendLocation = videoDiv;

    context = new AudioContext();
    gainNode = context.createGain();
    gainNode.gain.value = 1;

    var source = context.createMediaElementSource(videoElem);
    source.connect(gainNode);
    gainNode.connect(context.destination);

    $("#fullscreenbutton").click(fullscreen);
    $("#gainbutton").click(setGain);

    setInterval(onTimeout, 500);

	window.addEventListener("mousemove", function(e) { onMouseMove(e); }, false);

    setupVideoControls();

    subLime = new SubLimeSubtitles(false, false);
    $("#subtitlesbutton").click(function() { subLime.openSubtitles(); });

    cleanupLocalStorage(50);

    onTimeout(); //adjust width/height of video element right away
    window.onresize = onTimeout; // make sure width/height of video is changed right away
}

jQuery_2_1_0_for_vex(document).ready(onLoad);

document.onkeydown = function(evt)
{
    gotInteraction();
    if (evt.keyCode == 32)
    {
        if (videoElem.duration >= 0)
        {
            if (videoElem.paused)
                videoElem.play();
            else
                videoElem.pause();
        }
        checkPlayButton();
        evt.preventDefault();
        return false;
    }
}

document.onkeyup = function(evt)
{
    gotInteraction();
    if (evt.keyCode == 32)
    {
        evt.preventDefault();
        return false;
    }
}

document.onkeypress = function(evt)
{
    gotInteraction();
    if (evt.keyCode == 32)
    {
        evt.preventDefault();
        return false;
    }
}

