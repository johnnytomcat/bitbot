require('dotenv').config();

const { std } = require('mathjs');
const { sum } = require('ramda');
const chalk = require('chalk');
const moment = require('moment');

// Separated for alignment
const { AuthenticatedClient, PublicClient } = require('gdax');

const apiURI = 'https://api.gdax.com';

const b64secret = process.env.B64SECRET;
const key = process.env.KEY;
const passphrase = process.env.PASSPHRASE;

const trading = { from: 'BTC', to: 'USD' }
const granularity = 300;
const percentAboveLower = .25;
const percentBelowUpper = .35;
const tradeAmount = 0.002; // BTC
const tradeInterval = 15000;

const authedClient = new AuthenticatedClient(key, b64secret, passphrase, apiURI);
const publicClient = new PublicClient();

async function getCurrentBands() {
  try {
    const options = {
      start: moment().subtract(1, 'days').toString(),
      end: moment().toString(),
      granularity: granularity
    };
    console.log(options)
    const response = await publicClient.getProductHistoricRates(`${trading.from}-${trading.to}`, options);

    const closeItems = response.map((item) => {
      const [time, low, high, open, close, volume] = item;
      return close;
    });
    const sma = average(closeItems);
    const lowerBand = sma - (std(closeItems) * 1.9);
    const upperBand = sma + (std(closeItems) * 1.9);

    return { 
      count: closeItems.length,
      lowerBand: lowerBand.toFixed(2), 
      sma: sma.toFixed(2), 
      upperBand: upperBand.toFixed(2), 
    };
  }
  catch (e) {
    console.error(chalk.red(e));
  }
}

async function ticker() {
  const res = await publicClient.getProductTicker(`${trading.from}-${trading.to}`);
  return res;
}

// Main Program
(async () => {
  try {    
    setInterval(async function() { 
      const currentBands = await getCurrentBands();
      // console.log(chalk.yellow(`Items in history: ${currentBands.count}`));
      console.log(chalk.magenta(`SMA ${currentBands.sma}`) + 
      ' - ' + chalk.yellow(`Lower Band ${currentBands.lowerBand}`) + 
      ' - ' + chalk.cyan(`Upper Band ${currentBands.upperBand}`));
    
      const data = await ticker();
      const price = parseFloat(data.price).toFixed(2);
      const B = (price - currentBands.lowerBand) / (currentBands.upperBand - currentBands.lowerBand);

      console.log(chalk.cyan(`B: ${B}`));

      const accounts = await authedClient.getAccounts();
      console.log(`Available ${trading.from}: ${accounts.find(x => x.currency === trading.from).available}`);
      console.log(`Available ${trading.to}: ${parseFloat(accounts.find(x => x.currency === trading.to).available).toFixed(2)}`);

      if(B < percentAboveLower) {
        if (accounts.find(x => x.currency === trading.to).available <= (tradeAmount * price)) {
          console.log(chalk.bold.red(`Buy ${trading.from}: ${tradeAmount} at ${price} -- No funds available.`));
          return;
        }
        console.log(chalk.bold.green(`Buy ${trading.from}: ${tradeAmount} at ${price}`));

        const buyParams = {
          'price': price, // USD
          'size': tradeAmount,  // BTC
          'product_id': `${trading.from}-${trading.to}`,
        };
        const res = await authedClient.buy(buyParams);
        console.log(res);
      }
      else if(B > (1 - percentBelowUpper)) {
        if (accounts.find(x => x.currency === trading.from).available <= tradeAmount) {
          console.log('No coins available for trading');
          return;
        }
        console.log(chalk.bold.red(`Sell ${trading.from}: ${tradeAmount} at ${price}`));

        const sellParams = {
          'price': price, // USD
          'size': tradeAmount, // BTC
          'product_id': `${trading.from}-${trading.to}`,
        };
        const res = await authedClient.sell(sellParams);
        console.log(res);
      }
    }, tradeInterval);
  } catch (e) {
    console.log(e)
  }
})();

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
