#!/usr/bin/env bash
# Inventory the corpus by cost: which files are safe to read and which are not.
# Sizes are computed live, so this never goes stale as the corpus changes.
set -euo pipefail

ROOT=${1:-context}
[ -d "$ROOT" ] || { echo "no such directory: $ROOT" >&2; exit 1; }

# ~4 chars per token is close enough to rank files by context cost.
printf '%-10s %-9s %s\n' 'EST-TOKENS' 'VERDICT' 'FILE'
find "$ROOT" -type f \( -name '*.json' -o -name '*.md' -o -name '*.yaml' \) -print0 \
| xargs -0 wc -c 2>/dev/null \
| grep -v ' total$' \
| sort -rn \
| while read -r bytes file; do
    # An unfetched LFS pointer is ~133 bytes on disk but carries the real size
    # in its body. Reporting the pointer's size would label the 66MB catavail
    # fixture "ok-to-read" — the exact opposite of the truth.
    lfs=""
    if [ "$(head -c 42 "$file")" = "version https://git-lfs.github.com/spec/v1" ]; then
      bytes=$(awk '/^size /{print $2}' "$file")
      lfs="  (lfs, unfetched)"
    fi
    tok=$((bytes / 4))
    if   [ "$tok" -gt 50000 ]; then v='NEVER-READ'
    elif [ "$tok" -gt 5000  ]; then v='shape.sh'
    else                            v='ok-to-read'
    fi
    printf '%-10s %-9s %s%s\n' "$tok" "$v" "$file" "$lfs"
  done
