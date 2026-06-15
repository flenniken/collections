import * as webPush from 'web-push';

// Generate VAPID keys
const vapidKeys = webPush.generateVAPIDKeys();

// Save the public and private keys to files
const publicKeyPath = './vapid-public.pem';
const privateKeyPath = './vapid-private.pem';

fs.writeFileSync(publicKeyPath, vapidKeys.publicKey);
fs.writeFileSync(privateKeyPath, vapidKeys.privateKey);

console.log(`VAPID Public Key saved to ${publicKeyPath}`);
console.log(`VAPID Private Key saved to ${privateKeyPath}`);
