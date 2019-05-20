[![Build Status](https://img.shields.io/travis/com/GMOD/jbrowse-components/master.svg?logo=travis&style=for-the-badge)](https://travis-ci.com/GMOD/jbrowse-components)
[![Coverage Status](https://img.shields.io/codecov/c/github/GMOD/jbrowse-components/master.svg?logo=codecov&style=for-the-badge)](https://codecov.io/gh/GMOD/jbrowse-components/branch/master)

<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/GMOD/jbrowse-components.svg)](https://greenkeeper.io/) -->

# jbrowse-components

This repository contains information about JBrowse 2 development. It is being developed with React, mobx-state-tree, and webworkers

## Pre-requisites

You should have on your machine


* [git](https://git-scm.com/downloads),
* [npm](https://nodejs.org/en/download/)
* [yarn](https://yarnpkg.com/en/docs/install)

## Clone repo and download dependencies

To get started, clone and download dependencies with yarn

```sh
git clone https://github.com/GMOD/jbrowse-components.git
cd jbrowse-components
yarn
```


## Start jbrowse 2

JBrowse 2, aka jbrowse-web, can be started as follows


```sh
cd packages/jbrowse-web
yarn start
```

This initializes a webpack-dev-server and takes a minute to startup and then is available on http://localhost:3000

## More info

See [documentation](docs/README.md)
