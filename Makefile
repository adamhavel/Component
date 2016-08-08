.PHONY: build clean test

build: node_modules

node_modules:
	npm install

clean:
	rm -rf node_modules

test: node_modules
	node_modules/.bin/ava test/*.js
