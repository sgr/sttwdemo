
.PHONY: all image clean distclean

all: image


image:
	docker-compose create

run: image
	docker-compose up

shell: image
	docker-compose run app /bin/bash

uninstall:
	-docker-compose down --rm all

