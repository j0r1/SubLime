var http = require('http')
var fs = require('fs')
var app = http.createServer(handler);

app.listen(8080);

function handler(req, res) 
{
    console.log(req.user + ":" + req.url)
    
    var url = req.url;
    if (url == '/')
        url = "/index.html";

    // Just load the url interpreted as a file name
    fs.readFile(__dirname + url, function (err, data) 
    {
        if (err) 
        {
            res.writeHead(500);
            return res.end('Error loading ' + url);
        }

        res.writeHead(200);
        res.end(data);
    });
}

