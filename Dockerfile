FROM sgr0502/tw-node-skel-gyp
ENV HOME=/home/app

ADD https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem $HOME/
COPY ./src/ $HOME

RUN set -x \
 && update-ca-certificates \
 && apt-get update \
 && apt-get install -y --no-install-recommends bluetooth bluez bluez-tools libbluetooth-dev libudev-dev libcap2-bin \
 && npm install \
 && npm cache clean \
 && rm -frv .node-gyp \
 && chmod +x $HOME/runnode

WORKDIR $HOME

CMD ["./runnode"]
