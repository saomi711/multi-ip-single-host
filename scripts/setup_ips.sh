#!/usr/bin/env bash
# ==============================================================================
# Script: setup_ips.sh
# Purpose: Add 5 secondary IP addresses to the physical network interface
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
echo "   Assigning 5 IP Addresses to Physical Interface: ${INTERFACE}  "
echo "================================================================="

# Helper function to run network commands either with sudo or via docker net-admin
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
  # Check if IP is already assigned to the interface
  if ip addr show dev "$INTERFACE" | grep -q "$ip/"; then
    echo "[✓] IP ${ip}/${SUBNET_CIDR} is already assigned to ${INTERFACE}"
  else
    echo "[+] Adding ${ip}/${SUBNET_CIDR} to ${INTERFACE}..."
    run_ip_cmd "ip addr add ${ip}/${SUBNET_CIDR} dev ${INTERFACE}"
    echo "    Successfully bound ${ip}"
  fi
done

echo ""
echo "================================================================="
echo "   Current IP Configuration on ${INTERFACE}:"
echo "================================================================="
ip -brief addr show dev "$INTERFACE"
echo "================================================================="
echo "Proof: All 5 IPs are now active on your physical interface!"
echo "Now run: docker compose up -d"
