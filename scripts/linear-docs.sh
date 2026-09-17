#!/bin/sh
# Keeps the Linear copies of the project docs current (D-038).
#
# The repo files are the source of truth. docs/linear-docs.json lists each
# mirrored file, its Linear document, and the SHA-256 of the file as last
# copied. Claude copies a changed file with the Linear MCP, then records the
# copy with `mark`. Only /usr/bin tools are used, so the hook runs anywhere.
#
#   scripts/linear-docs.sh check
#       List docs whose Linear copy is out of date. Exits 1 if any are.
#   scripts/linear-docs.sh mark <path> <document-id> <document-url> <updated-at>
#       Record that <path>, as it is now, was copied to Linear.
#   scripts/linear-docs.sh stop-hook
#       Claude Code Stop hook. Blocks the first stop while a copy is stale.

set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
manifest="$root/docs/linear-docs.json"

stale() {
  jq -r '.docs[] | [.path, (.id // ""), (.sha256 // "")] | join("|")' "$manifest" |
    while IFS='|' read -r path id sha; do
      if [ ! -f "$root/$path" ]; then
        echo "- $path: the file is missing"
      elif [ -z "$id" ]; then
        echo "- $path: no Linear document yet"
      elif [ "$(shasum -a 256 "$root/$path" | cut -d ' ' -f 1)" != "$sha" ]; then
        echo "- $path: changed since its last copy (Linear document $id)"
      fi
    done
}

case "${1:-}" in
  check)
    list=$(stale)
    if [ -n "$list" ]; then
      printf 'These docs differ from their Linear copies:\n%s\n' "$list"
      exit 1
    fi
    echo "Every mirrored doc matches its Linear copy."
    ;;

  mark)
    if [ $# -ne 5 ]; then
      echo "usage: scripts/linear-docs.sh mark <path> <document-id> <document-url> <updated-at>" >&2
      exit 2
    fi
    path=$2
    if ! jq -e --arg p "$path" '.docs | any(.path == $p)' "$manifest" > /dev/null; then
      echo "$path isn't listed in docs/linear-docs.json" >&2
      exit 2
    fi
    sha=$(shasum -a 256 "$root/$path" | cut -d ' ' -f 1)
    jq --arg p "$path" --arg id "$3" --arg url "$4" --arg at "$5" --arg sha "$sha" \
      '(.docs[] | select(.path == $p)) |= (.id = $id | .url = $url | .sha256 = $sha | .linearUpdatedAt = $at)' \
      "$manifest" > "$manifest.tmp"
    mv "$manifest.tmp" "$manifest"
    echo "Recorded the Linear copy of $path."
    ;;

  stop-hook)
    active=$(jq -r '.stop_hook_active // false' 2> /dev/null || echo false)
    list=$(stale)
    [ -z "$list" ] && exit 0
    message=$(printf 'These docs differ from their Linear copies (D-038):\n%s' "$list")
    if [ "$active" = true ]; then
      jq -n --arg m "$message" '{systemMessage: ($m + "\nThey were not copied to Linear this turn.")}'
    else
      jq -n --arg m "$message" '{
        decision: "block",
        reason: ($m + "\nBefore stopping, copy each one to Linear as described under \"Docs in Linear\" in CLAUDE.md, then record it with: scripts/linear-docs.sh mark <path> <document-id> <document-url> <updated-at>")
      }'
    fi
    ;;

  *)
    echo "usage: scripts/linear-docs.sh check | mark <path> <id> <url> <updated-at> | stop-hook" >&2
    exit 2
    ;;
esac
