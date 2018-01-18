# Webcomic Server
This application is a class project for CMPS 115. 

The goal is to build a web application that allows webcomics to be read smoothly even on connections with latency or bandwidth issues. This repository contains the backend built in nodejs. The backend should provie a restful API for the frontend to workwith but should otherwise be decoupled (eg it does not serve html, css, images or do templating). Comic pages (the imsages) will probably be stored on a seperate service such as Amazon S3 or Google cloud storage.

This project was generated with [Express Generator](https://github.com/expressjs/generator) version 4.15.5.

# Installation
1. Clone the project using git

2. Run `npm install -g @angular/cli`

3. `npm install` within the project directory to get its dependencies.
