"use strict";

process.title = "Bitcoin Brute Force by Xuě Láng";

//Created by: Xuě Láng
//Licence : Black Hat License


// Importing required modules
const CoinKey = require('coinkey');
const fs = require('fs');
const crypto = require('crypto');
const cluster = require('cluster');
let numCPUs = require('os').cpus().length;
const blessed = require('blessed');

// Initializing a Set to store addresses
let addresses;
numCPUs = 4
addresses = new Set();
// Reading data from a file named 'data.txt'
const data = fs.readFileSync('./data.txt');
// Splitting the data by new line and adding each address to the Set
data.toString().split("\n").forEach(address => {
    if (address.startsWith('1')) {
        addresses.add(address);
    } else {
        console.error('Error: Addresses are not in correct format. Legacy Bitcoin Addresses must start with 1');
        process.exit(1);
    }
});

// Initializing an object to store counts for each worker
let counts = {};
let recentKeys = [];
let startTime = Date.now();
let lastRecentKeysUpdate = Date.now();

// Function to generate a private key and check if the corresponding public address is in the Set of addresses
function generate() {
 // Incrementing the count for the current worker
 counts[cluster.worker.id] = (counts[cluster.worker.id] || 0) + 1;
 // Sending the updated counts to the master process
 process.send({counts: counts});

 // Generating a random private key in hexadecimal format
 let privateKeyHex = crypto.randomBytes(32).toString('hex');

 // Creating a CoinKey object using the private key
 let ck = new CoinKey(Buffer.from(privateKeyHex, 'hex'));

 // Setting the compressed property of the CoinKey object to false
 ck.compressed = false;

 // Checking if the public address corresponding to the private key is in the Set of addresses
 if(addresses.has(ck.publicAddress)){
 console.log("");
 // Making a beep sound
 process.stdout.write('\x07');
 // Logging success message with the public address in green color
console.log("\x1b[32m%s\x1b[0m", ">> Match Found: " + ck.publicAddress);
var successString = "Wallet: " + ck.publicAddress + "\n\nSeed: " + ck.privateWif + "\n\nDon't forget to donate : Bitcoin: --";

// Saving the wallet and its private key (seed) to a file named 'match.txt'
fs.writeFileSync('./match.txt', successString, (err) => {
    if (err) throw err;
})

 // Exiting the process
 process.exit();
 }
}

// Checking if the current process is the master process
if (cluster.isMaster) {
    let screen = blessed.screen({
        smartCSR: true,
  top: '100%',
  width: '100%'
        
    });
    

    let boxes = [];

    let infoBox = blessed.box({
        top: '0%',
        left: 0,
        width: '100%',
        height: '30%',
        content: `//Created by: Xuě Láng`,
        border: {
          type: 'line'
        },
        style: {
          fg: 'green',
          border: {
            fg: 'green'
          }
        }
      });
      

for (let i = 0; i < numCPUs; i++) {
        let fontSize = Math.max(10 - numCPUs, 1); // decrease font size as number of cores 
        let box = blessed.box({
            top: `${30 + i * 50/numCPUs}%`,
    left: 0,
    width: '100%',
    height: `${40/numCPUs}%`,
    content: `Worker ${i+1} Keys generated: 0 Speed: 0 keys/min`,
            border: {
                type: 'line'
            },
            style: {
                fg: 'green',
                border: {
                    fg: 'green'
                },
                font: `monospace ${fontSize}` // set font size
            }
        });
        screen.append(infoBox);
        screen.append(box);
        boxes.push(box);
        
    
    }


 

    cluster.on('message', (worker, message) => {
        if (message.counts) {
            for (let workerId in message.counts) {
                let elapsedTimeInMinutes = (Date.now() - startTime) / 60000;
                let speedPerMinute = message.counts[workerId] / elapsedTimeInMinutes;
                boxes[workerId-1].setContent(`Worker ${workerId} Keys generated: ${message.counts[workerId]} Speed: ${speedPerMinute.toFixed(2)} keys/min`);
            }
            screen.render();
        }
        if (message.recentKeys) {
            let content = `Recent keys:\n`;
            message.recentKeys.forEach(key => {
                content += `Address: ${key.address} Private key:${key.privateKey}\n`;
            });
            recentKeysBox.setContent(content);
            screen.render();
        }
    });

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    setInterval(generate, 0);
}
