AGENTDIR=./agent
TWAPI=$(AGENTDIR)/bin/twApi.so
INDEXJS=$(AGENTDIR)/index.js
SDKSRC=./C_SDK.zip
FROM=armhf/node:6.10-slim
BUILD_API_SH=./scripts/build-api-on-docker.sh
BUILD_AGENT_SH=./scripts/build-agent-on-docker.sh

.PHONY: all image clean distclean

all: image

$(SDKSRC):
	$(error Download ThingWorx C SDK (C_SDK.zip) from https://developer.thingworx.com/)

# build ThingWorx C API -> ./agent/bin/twApi.so
$(TWAPI): $(SDKSRC)
	@if [ ! -d $(AGENTDIR) ]; \
        	then echo "mkdir -p $(AGENTDIR)"; mkdir -p $(AGENTDIR); \
        fi
	docker run -it --rm -v "$(PWD)":/build -w /build $(FROM) $(BUILD_API_SH)

# build ThingWorx NodeJS Agent -> ./agent/
$(INDEXJS): $(TWAPI)
	docker run -it --rm -v "$(PWD)":/build -w /build $(FROM) $(BUILD_AGENT_SH)

image: $(INDEXJS)
	docker-compose create

clean:
	-docker-compose down --rmi all
	sudo rm -f $(INDEXJS) $(AGENTDIR)/package.json $(AGENTDIR)/runnode
	sudo rm -fr $(AGENTDIR)/node_modules

distclean: clean
	sudo rm -fr ./agent
