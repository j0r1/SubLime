#!/bin/bash

mkdir ../appengine/page

for i in index.html \
		icon.png \
		background.js \
		jquery.min.js \
		sublime.css \
		sublimelet.js \
		vex-theme-wireframe.css \
		vex.css \
		vex.dialog.js \
		vex.js \

do
	cp $i ../appengine/page/
done
