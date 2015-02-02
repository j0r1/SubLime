
var SubLimeLetRun = (function()
{
    var instance = null;

    var SubLimeLetLoader = function(baseUrl)
    {
        var _this = this;
        var m_initialized = false;
        var m_initializing = false;

        var m_subLime = null;

        var resourcesInitialized = function()
        {
            console.log("Resources initialized");

            m_initializing = false;
            m_initialized = true;

            // These will get downloaded when the rest is finished, to make sure the app doesn't
            // wait for them
            var extraResources = [
                            //{ type: "link", url: "//fonts.googleapis.com/css?family=Open+Sans:800,700,400,600,300" }
                            { type: "link", url: "//fonts.googleapis.com/css?family=Titillium+Web:900,700,700italic" }
                          ];
            processResource(0, extraResources);

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
                            { type: "script", url: baseUrl + "/sublime.js" }
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

            if (!m_subLime)
                m_subLime = new SubLime(true);
            else
                m_subLime.run();
        }
    }

    return function(baseUrl)
    {
        if (!instance)
        {
            instance = new SubLimeLetLoader(baseUrl);
            console.log("Allocated new instance");
        }
        instance.run();
    }
})();

// For backward compatibility
var SubLimeLet = { }
SubLimeLet.run = SubLimeLetRun;

