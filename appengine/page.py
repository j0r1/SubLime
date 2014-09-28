#!/usr/bin/env python

import os
import pprint
import sys
import urllib2

contentTypeMap = {
        "html":     "text/html",
        "txt":      "text/plain",
        "jpg":      "image/jpeg",
        "png":      "image/png",
        "css":      "text/css",
        "doc":      "application/msword",
        "js":       "application/javascript",
        "css":      "text/css",
}

class ServeException(Exception): 
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg

def retrieveURL():
    url = sys.stdin.read(2048)
    f = urllib2.urlopen(url)

    sys.stdout.write("Content-type:" + f.info()["Content-type"] + "\n\n");
    done = False
    chunckSize = 1024*64
    totalSize = 0
    maxSize = 25*1024*1024 # Is 25 MB a good maximum?
    while not done:
        data = f.read(chunckSize)
        if len(data) == 0:
            done = True
        else:
            totalSize += len(data)
            sys.stdout.write(data)

            if totalSize > maxSize:
                done = True

def main():
    try:
        prefix = "./page"
        reqPath = os.environ['PATH_INFO']

        #if reqPath == "/url" and os.environ['REQUEST_METHOD'] == 'POST':
        #    retrieveURL()
        #    return

        if reqPath == "/":
            reqPath = "index.html"
        
        idx = 0
        while reqPath[idx] in "/.":
            idx += 1

        reqPath = reqPath[idx:]
        fullPath = os.path.join(prefix, reqPath)

        if os.path.isdir(fullPath):
            fullPath = os.path.join(fullPath, "index.html")

        if not os.path.isfile(fullPath):
            raise ServeException("Path %s does not exist" % fullPath)
        
        contType = "text/plain"
        dotPos = fullPath.rfind(".")
        if dotPos >= 0:
            ext = fullPath[dotPos+1:].lower()
            if ext in contentTypeMap:
                contType = contentTypeMap[ext]

        with open(fullPath, "rb") as f:
            data = f.read()

    except Exception as e:
        print "Status: 500 Internal server error"
        print "Content-type: text/plain"
        print
        print "Internal server error"
        print e
        return

    sys.stdout.write("Content-type: %s\n\n" % contType )
    sys.stdout.write(data);

if __name__ == "__main__":
    main()

