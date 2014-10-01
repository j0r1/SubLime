#!/bin/bash

mkdir ../chromeextension/

for i in manifest.json \
		background.js \
		icon.png \
		jquery.min.js \
		start.js \
		sublime.css \
		sublimelet.js \
		vex-theme-wireframe.css \
		vex.css \
		vex.dialog.js \
		vex.js \
		FileSaver.js \

do
	cp $i ../chromeextension/
done
