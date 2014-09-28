
chrome.browserAction.onClicked.addListener(function(tab) 
{
    var resId = "sherpassbg" + chrome.runtime.id;

    chrome.tabs.executeScript(null, { code: "(function() { try { if (jQuery) return 1; } catch(err) { } return 0; })()"}, function(results)
    {
        if (!results[0])
        {
            chrome.tabs.executeScript(null, { file: "jquery.min.js" }, function()
            {
                chrome.tabs.executeScript(null, { file: "jquery.touchy.js" }, function()
                {
/*                    chrome.tabs.executeScript(null, { file: "vex.js" }, function()
                    {
                        chrome.tabs.executeScript(null, { file: "vex.dialog.js" }, function()
                        {*/
                            chrome.tabs.executeScript(null, { file: "sherpass-bookmarklet.js" }, function()
                            {
                                chrome.tabs.executeScript(null, { file: "start.js" });
                            });
/*                        });
                    });*/
                });
            });
        }
        else
        {
            chrome.tabs.executeScript(null, { file: "start.js" });
        }
    });
});

