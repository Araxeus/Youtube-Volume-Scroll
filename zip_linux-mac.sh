#!/bin/bash

# transform scss to css
sass --update unpacked/popup
# zip recursive, sync files, ignore .scss and filenames starting with _
zip -r -FS Youtube-Volume-Scroll.zip unpacked/* -x *.scss _*
