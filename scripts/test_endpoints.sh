#!/usr/bin/env bash
# ==============================================================================
# Script: test_endpoints.sh
# Purpose: Test all 5 external IP:Port endpoints and 5 localhost:Port endpoints
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
else
  echo "[!] config.env not found in ${SCRIPT_DIR}"
  exit 1
fi

ENDPOINTS=(
  "Flavor 01 (Crimson Solaris)|http://${IP_1}:${PORT_1}|http://127.0.0.1:${LOCAL_PORT_1}"
  "Flavor 02 (Cyber Azure)|http://${IP_2}:${PORT_2}|http://127.0.0.1:${LOCAL_PORT_2}"
  "Flavor 03 (Emerald Aurora)|http://${IP_3}:${PORT_3}|http://127.0.0.1:${LOCAL_PORT_3}"
  "Flavor 04 (Neon Amethyst)|http://${IP_4}:${PORT_4}|http://127.0.0.1:${LOCAL_PORT_4}"
  "Flavor 05 (Solar Amber)|http://${IP_5}:${PORT_5}|http://127.0.0.1:${LOCAL_PORT_5}"
)

echo "=========================================================================="
echo "           MULTI-IP MULTI-PORT ENDPOINT VERIFICATION TEST                "
echo "=========================================================================="
echo ""

for entry in "${ENDPOINTS[@]}"; do
  IFS="|" read -r name ext_url loc_url <<< "$entry"

  echo "--------------------------------------------------------------------------"
  echo "[+] ${name}"
  echo "    External Target: ${ext_url}"
  echo "    Internal Target: ${loc_url}"

  # Test External IP
  ext_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "${ext_url}/" || echo "FAIL")
  if [[ "$ext_status" == "200" ]]; then
    flavor_header=$(curl -sI --connect-timeout 2 "${ext_url}/" | grep -i "X-Flavor:" | tr -d '\r')
    echo "    >>> EXTERNAL STATUS: [200 OK] (Direct IP Access Verified!)"
    echo "        Header: ${flavor_header}"
  else
    echo "    >>> EXTERNAL STATUS: [FAILED: ${ext_status}]"
    echo "        Tip: Ensure scripts/setup_ips.sh has been run and Nginx is active."
  fi

  # Test Local Target
  loc_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "${loc_url}/" || echo "FAIL")
  if [[ "$loc_status" == "200" ]]; then
    echo "    >>> LOCAL STATUS:    [200 OK] (Localhost Backend Active)"
  else
    echo "    >>> LOCAL STATUS:    [FAILED: ${loc_status}]"
  fi
done

echo "=========================================================================="
echo "Verification complete."
