// Genera un par de claves VAPID para Web Push.
// Uso: npm run gen:vapid  → pegá el resultado en .env.local
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\nAgregá esto a tu .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:tu-email@gmail.com\n`);
