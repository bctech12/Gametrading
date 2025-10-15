#!/usr/bin/env node
const https = require('https');
const readline = require('readline');

const id = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
const feedUrl = `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${id}`;

let midPrice = 0;
let stake = 5;            // fixed $5 for now (easy to change)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise(res => rl.question(q, ans => res(ans.trim())));
}

function fetchPrice() {
  return new Promise((resolve, reject) => {
    https.get(feedUrl, r => {
      let body = '';
      r.on('data', c => body += c);
      r.on('end', () => {
        try {
          const p = JSON.parse(body)[0];
          const price = Number(p.price.price) * Math.pow(10, Number(p.price.expo));
          resolve(price);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function gameLoop() {
  while (true) {
    console.log('\n----- new round -----');

    // 1. price refresher (quiet: no \r)
    const pricePoller = setInterval(async () => {
      midPrice = await fetchPrice().catch(() => {});
    }, 400);

    // 2. ask side
    const sideNum = await ask('1 = LONG (price UP)   2 = SHORT (price DOWN)  > ');
    clearInterval(pricePoller);

    const isLong = sideNum === '1';
    const entryPrice = midPrice;

    console.log(`\nYou bet $${stake}  ${isLong ? 'LONG' : 'SHORT'}  at ${entryPrice.toFixed(2)}`);
    console.log('5-second settlement...\n');

    // 3. countdown (show price once per second)
    for (let i = 5; i >= 0; i--) {
      await new Promise(r => setTimeout(r, 1000));
      console.log(`  t-${i}   ETH ${midPrice.toFixed(2)}`);
    }

    // 4. result
    const higher = midPrice > entryPrice;
    const win = isLong ? higher : !higher;
    console.log(`\nClose  ${midPrice.toFixed(2)}`);
    console.log(win
      ? `🎉  WIN  +${(stake * 2 * 0.99 - stake).toFixed(2)} USDC`
      : `💸  LOSE  -${stake} USDC`);

    await ask('\nPress <Enter> to play again...');
  }
}
gameLoop().catch(() => {});