(function() 
{
    var x = "SubLimeStart_" + chrome.runtime.id;
    var elem = document.getElementById(x);
    if (!elem)
    {
        var data = [ "",
    '            function mainInitialized()',
    '            {',
    '                console.log("Loaded main");',
    '                ',
    '                window.initializedSubOverlayBookmarklet = true;',
    '                window.initializingSubOverlayBookmarklet = false;',
    '                setTimeout(function() { subOverlayBookmarklet(); }, 0);',
    '            }',
    '',
    '            function initBookmarklet()',
    '            {',
    '                var s = document.createElement("script");',
    '                ',
    '                s.src = "chrome-extension://' + chrome.runtime.id + '/sublimelet.js";',
    '                s.onload = mainInitialized;',
    '',
    '                document.body.appendChild(s);',
    '            }',
    '',
    '            function subOverlayBookmarklet()',
    '            {',
    '                if (window.initializingSubOverlayBookmarklet)',
    '                    return;',
    '',
    '                if (!window.initializedSubOverlayBookmarklet)',
    '                {',
    '                    window.initializingSubOverlayBookmarklet = true;',
    '                    initBookmarklet();',
    '                    return;',
    '                }',
    '',
    '                SubLimeLetRun("chrome-extension://' + chrome.runtime.id + '");',
    '            }' ].join("\n");

        data = "void((function() { " + data + "\nsubOverlayBookmarklet(); })())";

        elem = document.createElement("script");
        elem.setAttribute("id", x);
        elem.innerHTML = data;
        document.head.appendChild(elem);
    }
    else
    {
        var data = elem.innerHTML;

        document.head.removeChild(elem);
        elem = document.createElement("script");
        elem.setAttribute("id", x);
        elem.innerHTML = data;
        document.head.appendChild(elem);
    }
})();
