#!/bin/bash

mkdir ../appengine/page

for i in index.html \
		icon.png \
		icon-128x128.png \
		favicon.png \
		background.js \
		jquery.min.js \
		sublime.css \
		sublimelet.js \
		vex-theme-wireframe.css \
		vex.css \
		vex.dialog.js \
		vex.js \
		FileSaver.js \
		sublimeshot2.png \

do
	cp $i ../appengine/page/
done
