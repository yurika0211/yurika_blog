#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/http_download_report.sh <download_list.txt> [output_dir] [report.md]

download_list.txt format:
  - Empty lines are ignored
  - Lines starting with # are comments
  - Each valid line:
      <url>
    or:
      <url> <custom_filename>

Example:
  ./scripts/http_download_report.sh ./scripts/download_urls.txt ./downloads ./download-report.md

Note:
  This script only supports HTTP/HTTPS downloads.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

LIST_FILE="$1"
OUTPUT_DIR="${2:-./downloads}"
REPORT_FILE="${3:-./download-report.md}"

if [[ ! -f "$LIST_FILE" ]]; then
  echo "List file not found: $LIST_FILE" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

escape_md() {
  sed 's/|/\\|/g'
}

report_tmp="$(mktemp)"
started_at="$(date '+%Y-%m-%d %H:%M:%S %Z')"

{
  echo "# Download Report"
  echo
  echo "- Started: $started_at"
  echo "- List file: \`$LIST_FILE\`"
  echo "- Output dir: \`$OUTPUT_DIR\`"
  echo
  echo "| # | URL | Output | HTTP | Bytes | SHA256 | Seconds | Status |"
  echo "|---:|---|---|---:|---:|---|---:|---|"
} > "$report_tmp"

idx=0
ok_count=0
fail_count=0
total_bytes=0

while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  line="$(printf '%s' "$raw_line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue

  idx=$((idx + 1))

  url="${line%%[[:space:]]*}"
  if [[ "$line" =~ [[:space:]] ]]; then
    output_name="$(printf '%s' "$line" | sed -E 's/^[^[:space:]]+[[:space:]]+//')"
  else
    output_name=""
  fi

  if [[ "$url" != http://* && "$url" != https://* ]]; then
    safe_url="$(printf '%s' "$url" | escape_md)"
    echo "| $idx | $safe_url | - | - | 0 | - | 0 | FAIL: only http/https supported |" >> "$report_tmp"
    fail_count=$((fail_count + 1))
    continue
  fi

  if [[ -z "$output_name" ]]; then
    output_name="$(basename "${url%%\?*}")"
    if [[ -z "$output_name" || "$output_name" == "/" || "$output_name" == "." ]]; then
      output_name="download_${idx}.bin"
    fi
  fi

  target="$OUTPUT_DIR/$output_name"
  part_file="${target}.part"
  err_file="$(mktemp)"
  start_ts="$(date +%s)"

  if meta="$(curl -L --fail --retry 2 --retry-delay 2 --connect-timeout 15 --silent --show-error --write-out '%{http_code}\t%{size_download}\t%{time_total}' -o "$part_file" "$url" 2>"$err_file")"; then
    IFS=$'\t' read -r http_code bytes seconds <<< "$meta"
    mv "$part_file" "$target"
    sha256="$(sha256sum "$target" | awk '{print $1}')"
    total_bytes=$((total_bytes + ${bytes%.*}))
    ok_count=$((ok_count + 1))

    safe_url="$(printf '%s' "$url" | escape_md)"
    safe_out="$(printf '%s' "$output_name" | escape_md)"
    echo "| $idx | $safe_url | $safe_out | $http_code | ${bytes%.*} | \`$sha256\` | ${seconds%.*} | OK |" >> "$report_tmp"
  else
    end_ts="$(date +%s)"
    elapsed=$((end_ts - start_ts))
    rm -f "$part_file"
    err_msg="$(tr '\n' ' ' < "$err_file" | sed -e 's/[[:space:]]\+/ /g' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | cut -c1-120)"

    safe_url="$(printf '%s' "$url" | escape_md)"
    safe_out="$(printf '%s' "$output_name" | escape_md)"
    safe_err="$(printf '%s' "$err_msg" | escape_md)"
    echo "| $idx | $safe_url | $safe_out | - | 0 | - | $elapsed | FAIL: $safe_err |" >> "$report_tmp"
    fail_count=$((fail_count + 1))
  fi

  rm -f "$err_file"
done < "$LIST_FILE"

finished_at="$(date '+%Y-%m-%d %H:%M:%S %Z')"
{
  echo
  echo "## Summary"
  echo
  echo "- Finished: $finished_at"
  echo "- Total items: $idx"
  echo "- Success: $ok_count"
  echo "- Failed: $fail_count"
  echo "- Total downloaded bytes: $total_bytes"
} >> "$report_tmp"

mv "$report_tmp" "$REPORT_FILE"
echo "Report generated: $REPORT_FILE"

