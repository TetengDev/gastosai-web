#!/usr/bin/env bash
#
# Record the feature showcase and produce one watchable MP4.
#
#   ./scripts/record-showcase.sh                 # record, title, write showcase/*.mp4
#   ./scripts/record-showcase.sh --attach TEN-367  # …and hand the file to Linear
#
# This is the presentation artifact — the thing you send someone who asks "what does it do?".
# `e2e/showcase.demo.ts` walks the whole product in one continuous take with captions burned into
# the page by Playwright, so ffmpeg is needed for two small things only: the title card, and
# turning Playwright's WebM into an MP4 that plays anywhere.
#
# Written after `../gastosai-mobile/scripts/record-demo.sh`, and it keeps that script's rules:
#
#   * **Refuse early.** A missing stack, a missing dependency or a failed walkthrough must cost
#     seconds, not a recording run and a corrupt file.
#   * **Every narration failure degrades.** A title card that will not build is a cosmetic loss;
#     the plainer artifact still gets written, and the script says what it lost and why.
#   * **50 MB is the ceiling.** Linear rejects an upload at or over it, so the file is measured
#     before anything is sent.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ISSUE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --attach)
      ISSUE="${2:-}"
      [[ -n "$ISSUE" ]] || { echo "--attach needs a Linear issue, e.g. --attach TEN-367" >&2; exit 2; }
      shift 2
      ;;
    -h|--help)
      echo "usage: $0 [--attach <LINEAR-ISSUE>]" >&2
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

WEB_URL="${E2E_BASE_URL:-http://localhost:5173}"
API_URL="${E2E_API_URL:-http://localhost:8080}"

# ── Refuse to start without the stack ───────────────────────────────────────────────────────────
#
# Playwright would otherwise spend a minute failing on a connection refused and leave a video of a
# browser error page. Both halves are checked: the walkthrough drives the web app, and every number
# on screen comes from the API behind it.
probe() {  # probe <url> <name>
  if ! curl -sS -o /dev/null --max-time 5 "$1" 2>/dev/null; then
    echo "✗ $2 is not answering at $1" >&2
    echo "  bring the stack up first:  python3 ../scripts/verify_local.py --up" >&2
    exit 1
  fi
}
probe "$WEB_URL" "the web dev server"
probe "$API_URL/actuator/health" "the backend"

VERSION="$(node -p "require('./package.json').version")"
OUT_DIR="showcase"
FINAL="$OUT_DIR/gastosai-showcase-${VERSION}.mp4"

# ── An ffmpeg that can actually draw text ───────────────────────────────────────────────────────
#
# Homebrew's plain `ffmpeg` is built without libfreetype and has no `drawtext` filter at all, so
# probing for the *binary* answers the wrong question — it is there, and the title card still
# cannot be drawn. `ffmpeg-full` has it and is keg-only, so it is not on PATH by default.
#
# Not `… -filters | grep -q drawtext`: `grep -q` exits on the first match, ffmpeg takes SIGPIPE and
# dies 141, and `set -o pipefail` reports the pipeline as failed — so the probe would answer "no
# drawtext" for a binary that has it. Read the list into a variable and match it in the shell.
FFMPEG=""
TITLER=""
for candidate in ffmpeg "$(brew --prefix ffmpeg-full 2>/dev/null)/bin/ffmpeg"; do
  [[ "$candidate" == "/bin/ffmpeg" ]] && continue   # empty brew prefix
  command -v "$candidate" >/dev/null 2>&1 || continue
  [[ -n "$FFMPEG" ]] || FFMPEG="$candidate"
  filters=$("$candidate" -hide_banner -filters 2>/dev/null || true)
  if [[ "$filters" == *" drawtext "* ]]; then
    TITLER="$candidate"
    break
  fi
done

if [[ -z "$FFMPEG" ]]; then
  # The container change is not cosmetic — without any ffmpeg there is no MP4 to write at all.
  echo "✗ no ffmpeg on PATH; the recording cannot be turned into an MP4." >&2
  echo "    brew install ffmpeg-full" >&2
  exit 127
fi
if [[ -z "$TITLER" ]]; then
  echo "⚠️  no drawtext-capable ffmpeg — the showcase will be written untitled." >&2
  echo "    Plain Homebrew ffmpeg is built without libfreetype. Fix with:" >&2
  echo "      brew install ffmpeg-full" >&2
fi

# ── Record ──────────────────────────────────────────────────────────────────────────────────────
echo "▶ recording the showcase (this walks the whole product; give it a few minutes)"
rm -rf test-results-demo
set +e
npx playwright test --config playwright.demo.config.ts e2e/showcase.demo.ts
WALK_STATUS=$?
set -e

RAW="$(find test-results-demo -name 'video.webm' -type f 2>/dev/null | head -1 || true)"

if (( WALK_STATUS != 0 )); then
  echo "" >&2
  echo "✗ the walkthrough failed — nothing is worth publishing from this run." >&2
  [[ -n "$RAW" ]] && echo "  partial recording kept for debugging: $RAW" >&2
  exit "$WALK_STATUS"
fi
[[ -n "$RAW" && -s "$RAW" ]] || { echo "the walkthrough passed but produced no video" >&2; exit 1; }

# ── Title card, then the container change ───────────────────────────────────────────────────────
#
# The card names the product, the version and the date, so a file that has been downloaded, renamed
# and forwarded twice still says what it is a showcase *of*.
mkdir -p "$OUT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

VIDEO_W=1366; VIDEO_H=900
CARD_SECS=4
FIT="scale=${VIDEO_W}:${VIDEO_H}:force_original_aspect_ratio=decrease,pad=${VIDEO_W}:${VIDEO_H}:(ow-iw)/2:(oh-ih)/2:color=0x0f0f13,setsar=1,fps=30"

BODY="$WORK/body.mp4"
echo "▶ transcoding"
"$FFMPEG" -nostdin -loglevel error -y -i "$RAW" -vf "$FIT" -pix_fmt yuv420p -crf 26 -an "$BODY"

TITLED=""
if [[ -n "$TITLER" ]]; then
  echo "▶ titling"
  CARD="$WORK/card.mp4"
  JOINED="$WORK/joined.mp4"
  FONT="Helvetica"
  # `textfile=` rather than `text=`: drawtext reads `:` `'` `%` and `,` as syntax, and quoting them
  # through two layers of shell and filtergraph is how a title silently mangles itself.
  printf 'GastosAI' > "$WORK/name.txt"
  printf 'Feature showcase · v%s' "$VERSION" > "$WORK/ver.txt"
  date '+%-d %B %Y' > "$WORK/date.txt"

  CARD_VF="drawtext=textfile=$WORK/name.txt:font=$FONT:fontcolor=0xf5f5f5:fontsize=84:x=(w-text_w)/2:y=330"
  CARD_VF+=",drawtext=textfile=$WORK/ver.txt:font=$FONT:fontcolor=0x8a8a94:fontsize=34:x=(w-text_w)/2:y=450"
  CARD_VF+=",drawtext=textfile=$WORK/date.txt:font=$FONT:fontcolor=0x8a8a94:fontsize=30:x=(w-text_w)/2:y=500"

  if "$TITLER" -nostdin -loglevel error -y \
      -f lavfi -i "color=c=0x0f0f13:s=${VIDEO_W}x${VIDEO_H}:d=${CARD_SECS}" \
      -vf "$CARD_VF" -pix_fmt yuv420p -r 30 "$CARD" 2>/dev/null \
    && "$TITLER" -nostdin -loglevel error -y -i "$CARD" -i "$BODY" \
      -filter_complex "[0:v]setsar=1,fps=30[a];[1:v]setsar=1,fps=30[b];[a][b]concat=n=2:v=1[v]" \
      -map "[v]" -pix_fmt yuv420p -crf 26 "$JOINED" 2>/dev/null \
    && [[ -s "$JOINED" ]]; then
    TITLED="$JOINED"
  else
    echo "  ⚠️ the title card failed to build — writing the showcase untitled" >&2
  fi
fi

cp "${TITLED:-$BODY}" "$FINAL"
[[ -n "$TITLED" ]] || echo "⚠️  no title card on $FINAL (see the ffmpeg note above)" >&2

SIZE_KB=$(( $(stat -f%z "$FINAL") / 1024 ))
SIZE_MB=$(( SIZE_KB / 1024 ))
if (( SIZE_MB >= 1 )); then echo "✔ $FINAL (${SIZE_MB}MB)"; else echo "✔ $FINAL (${SIZE_KB}KB)"; fi

# ── Publish, only when asked ────────────────────────────────────────────────────────────────────
if [[ -n "$ISSUE" ]]; then
  if (( SIZE_MB >= 50 )); then
    echo "the showcase is ${SIZE_MB}MB; Linear rejects uploads at or over 50MB." >&2
    echo "  the file is written — shorten the walkthrough rather than raising this." >&2
    exit 1
  fi
  ATTACH="../scripts/attach_evidence.py"
  [[ -f "$ATTACH" ]] || {
    echo "cannot find $ATTACH — the workspace repo must be the parent of this one" >&2
    exit 2
  }
  echo "▶ attaching to $ISSUE"
  ATTACH_ARGS=("$ISSUE" "$FINAL" --caption "GastosAI feature showcase v${VERSION}")
  if [[ -n "${PR_NUMBER:-}" ]]; then
    ATTACH_ARGS+=(--pr "$PR_NUMBER" --repo gastosai-web)
  fi
  python3 "$ATTACH" "${ATTACH_ARGS[@]}"
fi
