#!/bin/bash

./createindexhtml.sh >index.html

for i in index.html \
		icon.png \
		icon-128x128.png \
		favicon.png \
		background.js \
		jquery.min.js \
		sublime.css \
		sublime.js \
		sublimelet.js \
		vex-theme-wireframe.css \
		vex.css \
		vex.dialog.js \
		vex.js \
		FileSaver.js \
		sublimeshot2.png \
		viewer.js \
		viewer.html \
		viewer.css \
		spark-md5.js


do
	cp $i ../docs/
done
