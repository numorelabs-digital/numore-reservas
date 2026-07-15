const sharp = require("sharp");
const src = "ICONO/f71f8120-e83d-4559-8dec-64b90fdea64c.png";

(async () => {
  const meta = await sharp(src).metadata();
  console.log("original:", meta.width + "x" + meta.height);

  // Recorta el borde negro (deja el cuadrado del ícono)
  const trimmed = await sharp(src).trim({ threshold: 30 }).toBuffer();
  const tMeta = await sharp(trimmed).metadata();
  console.log("recortado:", tMeta.width + "x" + tMeta.height);

  // Genera los tamaños (cuadrado, cubriendo)
  for (const s of [192, 512]) {
    await sharp(trimmed).resize(s, s, { fit: "cover" }).png()
      .toFile("public/icons/icon-" + s + ".png");
  }
  await sharp(trimmed).resize(512, 512, { fit: "cover" }).png()
    .toFile("public/icons/icon.png");
  console.log("OK");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
