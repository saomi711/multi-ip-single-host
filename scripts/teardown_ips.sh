#!/usr/bin/env bash
# ==============================================================================
# Script: teardown_ips.sh
# Purpose: Remove the 5 secondary IP addresses from physical network interface
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

IPS=("$IP_1" "$IP_2" "$IP_3" "$IP_4" "$IP_5")

echo "================================================================="
echo "   Removing 5 Secondary IPs from Physical Interface: ${INTERFACE} "
echo "================================================================="

run_ip_cmd() {
  local cmd="$*"
  if [[ $EUID -eq 0 ]]; then
    eval "$cmd"
  elif sudo -n true 2>/dev/null; then
    sudo bash -c "$cmd"
  elif command -v docker &>/dev/null && docker ps &>/dev/null; then
    docker run --rm --net=host --cap-add=NET_ADMIN alpine sh -c "$cmd"
  else
    echo "[!] Root privileges required. Please run with sudo: sudo $0"
    exit 1
  fi
}

for ip in "${IPS[@]}"; do
  if ip addr show dev "$INTERFACE" | grep -q "$ip/"; then
    echo "[-] Removing ${ip}/${SUBNET_CIDR} from ${INTERFACE}..."
    run_ip_cmd "ip addr del ${ip}/${SUBNET_CIDR} dev ${INTERFACE}" || true
  else
    echo "[!] IP ${ip}/${SUBNET_CIDR} is not assigned to ${INTERFACE}"
  fi
done

echo ""
echo "================================================================="
echo "   Remaining IP Configuration on ${INTERFACE}:"
echo "================================================================="
ip -brief addr show dev "$INTERFACE"
echo "================================================================="
echo "Teardown complete."
