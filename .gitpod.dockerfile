FROM ubuntu:22.04

RUN sh -c "echo deb-src http://ubuntu.com/ubuntu/ jammy main restricted >> /etc/apt/sources.list" \
 && sh -c "echo deb-src http://ubuntu.com/ubuntu/ jammy-updates main restricted >> /etc/apt/sources.list" \
 && sh -c "echo deb-src http://ubuntu.com/ubuntu/ jammy-security main restricted >> /etc/apt/sources.list" \
 && sh -c "echo deb-src http://ubuntu.com/ubuntu/ jammy-security universe >> /etc/apt/sources.list" \
 && sh -c "echo deb-src http://ubuntu.com/ubuntu/ jammy-security multiverse >> /etc/apt/sources.list"

RUN apt-get update
RUN apt-get install -y sudo
RUN apt-get install -y libpoco-dev
RUN apt-get install -y python3-polib
RUN apt-get install -y libcap-dev
RUN apt-get install -y npm
RUN apt-get install -y libpam-dev
RUN apt-get install -y libzstd-dev
RUN apt-get install -y wget
RUN apt-get install -y git
RUN apt-get install -y build-essential
RUN apt-get install -y libtool
RUN apt-get install -y libcap2-bin
RUN apt-get install -y python3-lxml
RUN apt-get install -y libpng-dev
RUN apt-get install -y libcppunit-dev
RUN apt-get install -y pkg-config
RUN apt-get install -y fontconfig
RUN apt-get install -y snapd
RUN apt-get install -y chromium-browser
RUN apt-get build-dep -y libreoffice
RUN pip install lxml
RUN pip install polib

