const sharp = require("sharp");
const fs = require("fs");
const svg = fs.readFileSync("public/icons/icon.svg");
(async () => {
  await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(svg).resize(512, 512).png().toFile("public/icons/icon.png");
  console.log("iconos generados OK");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
