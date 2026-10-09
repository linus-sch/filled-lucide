#!/bin/sh
# Render the website's PNG assets from the HTML sources next to this script:
#   site/og-image.png              link preview (1200×630)
#   site/apple-touch-icon.png      iOS home screen icon (180×180)
#   site/icon-192.png, icon-512.png  web app manifest icons
#   site/favicon.ico               48×48 fallback for clients that ask for /favicon.ico
#
#   sh tools/build-cdn/assets/render.sh
#
# Needs Google Chrome and macOS `sips`. The PNGs are committed; run this only
# after changing the logo or the hero copy.
set -e
cd "$(dirname "$0")"
assets="$(pwd)"
site="$assets/../site"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
shot() { "$chrome" --headless=new --hide-scrollbars "$@" >/dev/null 2>&1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

shot --window-size=1200,630 --screenshot="$site/og-image.png" "file://$assets/og-image.html"

shot --window-size=512,512 --screenshot="$tmp/icon.png" "file://$assets/app-icon.html"
cp "$tmp/icon.png" "$site/icon-512.png"
sips -z 192 192 "$tmp/icon.png" --out "$site/icon-192.png" >/dev/null
sips -z 180 180 "$tmp/icon.png" --out "$site/apple-touch-icon.png" >/dev/null

shot --window-size=512,512 --default-background-color=00000000 \
  --screenshot="$tmp/favicon.png" "file://$assets/app-icon.html#transparent"
sips -z 48 48 "$tmp/favicon.png" --out "$tmp/favicon-48.png" >/dev/null
# An .ico file may hold a PNG as is: a 6-byte header, one 16-byte directory
# entry, then the PNG.
node -e '
  const fs = require("fs");
  const png = fs.readFileSync(process.argv[1]);
  const head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head.writeUInt8(48, 6);
  head.writeUInt8(48, 7);
  head.writeUInt16LE(1, 10);
  head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18);
  fs.writeFileSync(process.argv[2], Buffer.concat([head, png]));
' "$tmp/favicon-48.png" "$site/favicon.ico"

echo "Rendered og-image.png, apple-touch-icon.png, icon-192.png, icon-512.png, favicon.ico"
