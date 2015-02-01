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
    document.getElementById("video").src = URL.createObjectURL(file);
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
    else if (elem.webkitRequestFullScreen)
        elem.webkitRequestFullScreen();
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

var onCheckVideoSizeTimeout = function()
{
    if (!videoElem)
        return;

    var w = video.videoWidth;
    if (w <= 0)
        return;

    var $ = jQuery_2_1_0_for_vex;
    var W = $(window).width();

    var H = Math.round(W/w*video.videoHeight);

    videoElem.style.width = "" + W + "px";
    videoElem.style.height = "" + H + "px";
    videoDiv.style.width = "" + W + "px";
    videoDiv.style.height = "" + H + "px";
}

function onLoad()
{
    var $ = jQuery_2_1_0_for_vex;
    var elem = document.getElementById("loadfile");
    elem.onchange = loadVideo;

    vex.defaultOptions.className = 'vex-theme-wireframe';

    var video = document.getElementById("video");

    context = new webkitAudioContext();
    gainNode = context.createGain();
    gainNode.gain.value = 1;

    var source = context.createMediaElementSource(video);
    source.connect(gainNode);
    gainNode.connect(context.destination);

    $("#fullscreenbutton").click(fullscreen);
    $("#gainbutton").click(setGain);
        
    videoElem = document.getElementById("video");
    videoDiv = document.getElementById("videodiv");

    setInterval(onCheckVideoSizeTimeout, 1000);
}

jQuery_2_1_0_for_vex(document).ready(onLoad);

