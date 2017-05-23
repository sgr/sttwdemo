#!/bin/sh
#AGENT_URL=https://github.com/ThingworxDevZone/thingworx-nodejs-agent/archive/master.zip
AGENT_URL=https://github.com/sgr/thingworx-nodejs-agent/archive/tls.zip
BUILD=/build
sed -i.bak -e "s%http://deb.debian.org/debian%http://ftp.jp.debian.org/debian%g" /etc/apt/sources.list
apt-get update
apt-get install -y wget unzip build-essential python-dev
npm install node-gyp -g
node-gyp install
 
cp $BUILD/src/* $BUILD/agent/
cd $BUILD/agent
wget $AGENT_URL
mkdir tmp
unzip -d tmp tls.zip
rm tls.zip
npm install

npm install -g flatten-packages
flatten-packages

npm cache clean
rm -fr tmp
rm -fr .node-gyp
