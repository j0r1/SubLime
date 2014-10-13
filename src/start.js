(function() 
{
    var x = "SubLimeStart_" + chrome.runtime.id;
    var x2 = "SubLimeStart_RunAgain_" + chrome.runtime.id;
    var elem = document.getElementById(x);
    if (!elem)
    {
        elem = document.createElement("script");
        elem.setAttribute("id", x);
        elem.innerHTML = [ '(function()',
                           '{',
                           ' var s = document.createElement("script");',
                           ' s.src = "chrome-extension://' + chrome.runtime.id + '/sublimelet.js";',
                           ' s.onload = function() { SubLimeLetRun("chrome-extension://' + chrome.runtime.id + '"); }',
                           ' document.body.appendChild(s);',
                           '})()' ].join('\n');

        document.body.appendChild(elem);
    }
    else
    {
        elem = document.getElementById(x2);
        if (elem)
            document.body.removeChild(elem);

        elem = document.createElement("script");
        elem.setAttribute("id", x2);
        elem.innerHTML = 'SubLimeLetRun("chrome-extension://' + chrome.runtime.id + '");';
        document.body.appendChild(elem);
    }
})();
