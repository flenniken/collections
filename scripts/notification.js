"use strict";

// Generate VAPID keys
//
// Run from the collections container:
//
// cd ~/collections
// node scripts/notification.js

if (!process.env.coder_env) {
  console.log("Run from the Collection's docker environment.")
  return
}

const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log(`VAPID Public:

${vapidKeys.publicKey}

VAPID Private:

${vapidKeys.privateKey}
`)
