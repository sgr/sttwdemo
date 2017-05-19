FROM armhf/node:6.10-slim

RUN set -x \
 && update-ca-certificates \
# && useradd -d /home/app -s /bin/false app \
 && apt-get update \
 && apt-get install -y bluetooth bluez bluez-tools libbluetooth-dev libudev-dev libcap2-bin 

ENV HOME=/home/app

COPY agent/ $HOME/

ADD https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem $HOME/

RUN set -x \
 && mkdir -p /opt/thingworx \
# && chown -R app:app /opt/thingworx
# && chown -R app:app $HOME \
 && chmod +x $HOME/runnode

WORKDIR $HOME

#USER app
CMD ["./runnode"]
