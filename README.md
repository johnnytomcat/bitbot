# BitBot
Only works with `gdax` right now and runs the `bollenger band` strategy.

## Install
```bash 
$ git clone git@github.com:johnnytomcat/bitbot.git
$ cd bitbot
$ npm install
```

## Setup ENV
Create a `.env` in the projects root directory.

```
# Fill in GDAX API credentials
KEY = ""
B64SECRET = ""
PASSPHRASE = ""
```

## Run Program
```
$ node ./bitbot.js
```