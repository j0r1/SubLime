#!/bin/bash

mkdir ../chromeextension/

for i in manifest.json \
		background.js \
		icon.png \
		jquery.min.js \
		start.js \
		sublime.css \
		sublimelet.js \
		sublime.js \
		vex-theme-wireframe.css \
		vex.css \
		vex.dialog.js \
		vex.js \
		FileSaver.js \
		spark-md5.js \
		viewer.css \
		viewer.html \
		viewer.js

do
	cp $i ../chromeextension/
done
