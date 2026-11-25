.PHONY: install dev build client test browser browser-order browser-states prototype verify

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

client:
	npm run test:client -- --reporter=verbose

test:
	npm test

browser: build
	npm run test:integration

browser-order: build
	npm run test:integration -- integration/order.spec.ts

browser-states: build
	npm run test:integration -- integration/states.spec.ts

prototype: build
	npm run test:integration -- integration/prototype.spec.ts

verify: test browser
