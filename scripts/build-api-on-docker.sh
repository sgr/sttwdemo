#!/bin/sh

WORK=/build/agent
 
apt-get update
apt-get install -y build-essential unzip libssl-dev

mkdir $WORK/bin
mkdir $WORK/C_SDK
unzip -d $WORK/C_SDK /build/C_SDK.zip
#sed -i -e '11a #include <limits.h>' $WORK/C_SDK/src/porting/twLinux.c
cd $WORK/C_SDK/build
#sed -i -e '9 s/gcc-linux-x86-64/gcc-linux-arm/g' Makefile
sed -i -e '9 s/gcc-linux-x86-64/gcc-linux-arm-openssl/g' Makefile
sed -i -e '33d' platforms/gcc-linux-arm-openssl/Makefile.gcc-linux-arm-openssl
sed -i -e '32a TLS_INC_DIR  = /usr/include' platforms/gcc-linux-arm-openssl/Makefile.gcc-linux-arm-openssl
sed -i -e '36d' platforms/gcc-linux-arm-openssl/Makefile.gcc-linux-arm-openssl
sed -i -e '35a TLS_LIB_DIR  = /usr/lib/arm-linux-gnueabihf' platforms/gcc-linux-arm-openssl/Makefile.gcc-linux-arm-openssl
make shared
#cp bin/gcc-linux-arm/debug/twApi.so $WORK/bin/
cp bin/gcc-linux-arm-openssl/debug/twApi.so $WORK/bin/
cd $WORK
rm -fr $WORK/C_SDK
