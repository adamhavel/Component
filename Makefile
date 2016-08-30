.PHONY: build clean test

build: node_modules

node_modules:
	npm install --production

node_modules-dev:
	npm install --dev

clean:
	rm -rf node_modules

test: node_modules-dev
	node_modules/.bin/ava test/*.js
