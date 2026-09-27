#!/bin/bash
# Screenshot tools/turnaround.html headless (no dev server, no browser pane): a model sheet PNG for comparing a suit
# against reference art.
#   tools/turnaround.sh out.png "only=sazabi&views=front,side,back,q" [width,height]
# The page draws rows of suits x columns of views; size the window to fit (px per view x columns, ~480 per row).
root=$(cd "$(dirname "$0")/.." && pwd)
out=$1; q=$2; size=${3:-1360,560}
prof=$(mktemp -d)
rm -f "$out"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$prof" \
  --allow-file-access-from-files --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size="$size" --virtual-time-budget=20000 --screenshot="$out" "file://$root/tools/turnaround.html?$q" >/dev/null 2>&1 &
pid=$!
# Chrome writes the screenshot and then lingers; stop it once the file lands.
for _ in $(seq 1 120); do [ -s "$out" ] && break; sleep 0.5; done
sleep 0.5
kill "$pid" 2>/dev/null; pkill -f "$prof" 2>/dev/null
rm -rf "$prof"
[ -s "$out" ] && echo "$out" || { echo "no screenshot" >&2; exit 1; }
