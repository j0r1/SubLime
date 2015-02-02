var jQuery_2_1_0_for_vex = jQuery.noConflict(true);

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
    if (!endsWith(name, ".mp4", true) && !endsWith(name, ".webm"))
        throw "Filename does not end with '.mp4' or '.webm'";
}

function onVideoSelected(file)
{
    videoElem.src = URL.createObjectURL(file);
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
var lastMouseTime = 0;

function onMouseMove(evt)
{
    var $ = jQuery_2_1_0_for_vex;

    lastMouseTime = performance.now();
    $(videoDiv).css("cursor", "default");
    $("#video-controls").show();
}

function onTimeout()
{
    var $ = jQuery_2_1_0_for_vex;
    var now = performance.now();

    // See if we should hide the mouse
    if (now - lastMouseTime > 5000)
    {
        $(videoDiv).css("cursor", "none");
        $("#video-controls").hide();
    }

    var w = videoElem.videoWidth;
    var h = videoElem.videoHeight;
    if (w <= 0 || h <= 0)
    {
        w = 16;
        h = 9;
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

    checkPlayButton();
}

function checkPlayButton()
{
    var playing = true;

    if (videoElem.paused)
        playing = false;
    if (videoElem.ended)
        playing = false;
    
	var playButton = document.getElementById("play-pause");
    if (playing)
		playButton.innerHTML = "Pause";
    else
		playButton.innerHTML = "Play";
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
		var time = video.duration * (seekBar.value / 100);

		// Update the video time
		video.currentTime = time;
	});

	
	// Update the seek bar as the video plays
	video.addEventListener("timeupdate", function() {
		// Calculate the slider value
		var value = (100 / video.duration) * video.currentTime;

		// Update the slider value
		seekBar.value = value;
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

var subLime = null;

function onLoad()
{
    var $ = jQuery_2_1_0_for_vex;
    var elem = document.getElementById("loadfile");
    elem.onchange = loadVideo;

    videoElem = document.getElementById("video");
    videoDiv = document.getElementById("videodiv");

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

    subLime = new SubLime(false, false);
    $("#subtitlesbutton").click(function() { subLime.openSubtitles(); });
}

jQuery_2_1_0_for_vex(document).ready(onLoad);

document.onkeydown = function(evt)
{
    console.log(evt.keyCode);
    if (evt.keyCode == 32)
    {
        if (videoElem.paused)
            videoElem.play();
        else
            videoElem.pause();

        checkPlayButton();
    }
    return true;
}

document.onkeyup = function(evt)
{
    return true;
}

document.onkeypress = function(evt)
{
    return true;
}
