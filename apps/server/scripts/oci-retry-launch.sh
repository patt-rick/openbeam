#!/usr/bin/env bash
# Rotate through all Availability Domains creating a VM.Standard.A1.Flex
# instance until one succeeds. Run in OCI Cloud Shell — it's already
# authenticated, so no API key setup is required.
#
# Usage:
#   bash oci-retry-launch.sh
# Override defaults with env vars:
#   DISPLAY_NAME=foo OCPUS=2 MEMORY_GB=12 RETRY_INTERVAL=120 bash oci-retry-launch.sh
#
# Press Ctrl+C to stop. The script is safe to re-run if you stop and resume.

set -euo pipefail

DISPLAY_NAME="${DISPLAY_NAME:-openbeam-server}"
SHAPE="VM.Standard.A1.Flex"
OCPUS="${OCPUS:-4}"
MEMORY_GB="${MEMORY_GB:-24}"
RETRY_INTERVAL="${RETRY_INTERVAL:-60}"
LOG_FILE="/tmp/oci-launch-err.log"

echo "==> Discovering required OCIDs from your tenancy..."

# Tenancy / root compartment (Cloud Shell has $OCI_TENANCY pre-set)
TENANCY_ID="${OCI_TENANCY:-}"
if [ -z "$TENANCY_ID" ]; then
  TENANCY_ID=$(oci iam compartment list --query 'data[0]."compartment-id"' --raw-output 2>/dev/null)
fi
COMPARTMENT_ID="$TENANCY_ID"
echo "    compartment: $COMPARTMENT_ID"

# Latest Ubuntu 22.04 ARM image
IMAGE_ID=$(oci compute image list \
  --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "$SHAPE" \
  --sort-by TIMECREATED --sort-order DESC \
  --query 'data[0].id' --raw-output)
if [ -z "$IMAGE_ID" ] || [ "$IMAGE_ID" = "null" ]; then
  echo "ERROR: Couldn't find a Canonical Ubuntu 22.04 image for $SHAPE in this region."
  exit 1
fi
echo "    image:       $IMAGE_ID"

# A public subnet to attach to
SUBNET_ID=$(oci network subnet list -c "$COMPARTMENT_ID" \
  --query 'data[?"prohibit-public-ip-on-vnic"==`false`] | [0].id' \
  --raw-output 2>/dev/null || echo "")
if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" = "null" ]; then
  echo
  echo "ERROR: No public subnet found in your tenancy."
  echo "Create one first: OCI Console → Networking → Virtual Cloud Networks"
  echo "  → Start VCN Wizard → 'VCN with Internet Connectivity' → accept defaults."
  echo "Then re-run this script."
  exit 1
fi
echo "    subnet:      $SUBNET_ID"

# Availability domains in this region
ADS=$(oci iam availability-domain list -c "$COMPARTMENT_ID" \
  --query 'data[].name' --raw-output \
  | tr -d '[]" ' | tr ',' '\n' | grep -v '^$')
AD_COUNT=$(echo "$ADS" | wc -l)
echo "    ADs to try:  $AD_COUNT"
echo "$ADS" | sed 's/^/                 /'

# SSH public key
if [ -z "${SSH_PUBLIC_KEY:-}" ]; then
  echo
  echo "Paste your SSH PUBLIC key (one line starting with 'ssh-ed25519' or 'ssh-rsa'),"
  echo "then press Enter:"
  read -r SSH_PUBLIC_KEY
fi
if [[ ! "$SSH_PUBLIC_KEY" =~ ^ssh- ]]; then
  echo "ERROR: That doesn't look like a public SSH key. Should start with 'ssh-ed25519' or 'ssh-rsa'."
  exit 1
fi

echo
echo "==> Retry loop starting. Press Ctrl+C to stop. Sleep between rounds: ${RETRY_INTERVAL}s"
echo

attempt=0
while true; do
  attempt=$((attempt + 1))
  while IFS= read -r AD; do
    [ -z "$AD" ] && continue
    ts=$(date '+%H:%M:%S')
    printf '[%s] attempt %d  %s ... ' "$ts" "$attempt" "$AD"
    if oci compute instance launch \
        --availability-domain "$AD" \
        --compartment-id "$COMPARTMENT_ID" \
        --shape "$SHAPE" \
        --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
        --image-id "$IMAGE_ID" \
        --subnet-id "$SUBNET_ID" \
        --display-name "$DISPLAY_NAME" \
        --assign-public-ip true \
        --metadata "{\"ssh_authorized_keys\":\"$SSH_PUBLIC_KEY\"}" \
        --wait-for-state RUNNING >/dev/null 2>"$LOG_FILE"; then
      echo "OK"
      echo
      echo "================================================"
      echo "  SUCCESS — instance launched in $AD"
      echo "================================================"
      INST_ID=$(oci compute instance list -c "$COMPARTMENT_ID" \
        --display-name "$DISPLAY_NAME" --lifecycle-state RUNNING \
        --query 'data[0].id' --raw-output)
      PUBLIC_IP=$(oci compute instance list-vnics --instance-id "$INST_ID" \
        --query 'data[0]."public-ip"' --raw-output)
      echo
      echo "  Public IP:  $PUBLIC_IP"
      echo "  SSH:        ssh ubuntu@$PUBLIC_IP"
      echo
      echo "Next: open ports 80/443 in the security list, then run the bootstrap."
      exit 0
    elif grep -q -i "out of host capacity" "$LOG_FILE"; then
      echo "out of capacity"
    elif grep -q -i "TooManyRequests\|rate" "$LOG_FILE"; then
      echo "rate-limited (will back off)"
      sleep 30
    else
      echo "ERROR — non-capacity failure:"
      sed 's/^/    /' "$LOG_FILE"
      exit 1
    fi
  done <<< "$ADS"
  echo "    ... all ADs full this round. Sleeping ${RETRY_INTERVAL}s before next try."
  sleep "$RETRY_INTERVAL"
done
