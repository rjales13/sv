#!/usr/bin/env bash
# Print a corpus JSON file's SCHEMA (key paths + value types) without printing
# its data. Safe on multi-gigabyte files: array payloads are sampled at one
# element before paths are derived, so cost is independent of record count.
set -euo pipefail

usage() { echo "usage: shape.sh <file.json> [--sample N] [--max N] [--grep PATTERN]" >&2; exit 2; }

[ $# -ge 1 ] || usage
FILE=$1; shift
SAMPLE=0; MAX=200; PAT=""
while [ $# -gt 0 ]; do
  case $1 in
    --sample) SAMPLE=${2:?}; shift 2 ;;
    --max)    MAX=${2:?};    shift 2 ;;
    --grep)   PAT=${2:?};    shift 2 ;;
    *) usage ;;
  esac
done

[ -f "$FILE" ] || { echo "no such file: $FILE" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq >= 1.6 is required (brew install jq / apt-get install jq)" >&2; exit 1; }

# `context/mock-data/*.full.json` is Git LFS-tracked (.gitattributes). Without
# the objects fetched, the file on disk is a 133-byte pointer, and jq's "invalid
# numeric literal" is a confusing way to learn that.
if [ "$(head -c 42 "$FILE")" = "version https://git-lfs.github.com/spec/v1" ]; then
  REAL=$(awk '/^size /{print $2}' "$FILE")
  echo "$FILE is an unfetched Git LFS pointer (real size: ${REAL:-?} bytes)." >&2
  echo "fetch it with: git lfs pull --include='$FILE'" >&2
  exit 3
fi

TYPE=$(jq -r 'type' "$FILE" 2>/dev/null) || {
  echo "not valid JSON: $FILE" >&2
  echo "(this script is for corpus JSON; read prose docs directly)" >&2
  exit 1
}
printf '# %s\n# top-level: %s' "$FILE" "$TYPE"
if [ "$TYPE" = array ]; then
  printf ' of %s records (sampling index %s)' "$(jq -r 'length' "$FILE")" "$SAMPLE"
fi
printf '\n\n'

# Sample first so paths() never walks the whole document.
# Numeric path segments become [] so array members collapse to one path.
SCHEMA=$(jq -r --argjson i "$SAMPLE" '
  (if type=="array" then .[$i] else . end) as $r
  | [ $r | paths(scalars) as $p
      | ($p | map(if type=="number" then "[]" else tostring end) | join("."))
        + "\t" + ($r | getpath($p) | type) ]
  | unique[]' "$FILE")

if [ -n "$PAT" ]; then
  SCHEMA=$(printf '%s\n' "$SCHEMA" | grep -i -- "$PAT" || true)
  [ -n "$SCHEMA" ] || { echo "(no key path matching '$PAT')"; exit 0; }
fi

TOTAL=$(printf '%s\n' "$SCHEMA" | grep -c . || true)
# Truncation happens inside awk, NOT via `| head -n`: head closes the pipe
# early, printf then takes EPIPE, and `set -o pipefail` turns that into a
# failure. It is also flaky — the schema usually fits the 64KB pipe buffer, so
# printf often finishes first and the error only appears sometimes. awk reads
# all input, so nothing closes the pipe early.
# The width is baked into a format string rather than using printf's `%-*s`,
# which mawk (Ubuntu's default awk) does not reliably support.
printf '%s\n' "$SCHEMA" \
  | awk -F'\t' -v max="$MAX" '
      NR <= max { p[NR]=$1; v[NR]=$2; if (length($1) > w) w = length($1) }
      END {
        n = (NR < max ? NR : max)
        fmt = "%-" w "s  %s\n"
        for (i = 1; i <= n; i++) printf fmt, p[i], v[i]
      }' 
[ "$TOTAL" -gt "$MAX" ] && printf '\n... %s more paths (raise --max, or narrow with --grep)\n' "$((TOTAL - MAX))"
exit 0
