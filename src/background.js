
chrome.browserAction.onClicked.addListener(function(tab) 
{
    chrome.tabs.executeScript(null, { code: "(function() { try { if (jQuery_2_1_0_for_vex) return 1; } catch(err) { } return 0; })()"}, function(results)
    {
        if (!results[0])
        {
            chrome.tabs.executeScript(null, { file: "jquery.min.js" }, function()
            {
                chrome.tabs.executeScript(null, { code: "var jQuery_2_1_0_for_vex = jQuery.noConflict(true);" }, function()
                {
                    chrome.tabs.executeScript(null, { file: "vex.js" }, function()
                    {
                        chrome.tabs.executeScript(null, { file: "vex.dialog.js" }, function()
                        {
                            chrome.tabs.executeScript(null, { file: "sublimelet.js" }, function()
                            {
                                chrome.tabs.executeScript(null, { file: "start.js" });
                            });
                        });
                    });
                });
            });
        }
        else
        {
            chrome.tabs.executeScript(null, { file: "start.js" });
        }
    });
});

