#!/usr/bin/env bash
# Launch Aurora backend EC2 (Amazon Linux 2023) + Elastic IP + security group.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${AWS_KEY_NAME:-synapse-enclave-key}"
INSTANCE_TYPE="${AWS_INSTANCE_TYPE:-t3.small}"
PROJECT_TAG="aurora"
SG_NAME="aurora-backend-sg"

export AWS_DEFAULT_REGION="$REGION"

echo "==> Region: $REGION | Key: $KEY_NAME | Type: $INSTANCE_TYPE"

VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  echo "No default VPC in $REGION"
  exit 1
fi

SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "==> Creating security group $SG_NAME"
  SG_ID=$(aws ec2 create-security-group --group-name "$SG_NAME" --description "Aurora API + Caddy HTTPS" --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0
  aws ec2 create-tags --resources "$SG_ID" --tags "Key=Project,Value=$PROJECT_TAG"
fi

EXISTING=$(aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=$PROJECT_TAG" "Name=tag:Role,Values=backend" \
            "Name=instance-state-name,Values=running,pending,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || true)

if [[ -n "$EXISTING" && "$EXISTING" != "None" ]]; then
  echo "==> Existing Aurora backend instance: $EXISTING (reusing)"
  INSTANCE_ID="$EXISTING"
  if [[ "$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].State.Name' --output text)" == "stopped" ]]; then
    aws ec2 start-instances --instance-ids "$INSTANCE_ID" >/dev/null
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
  fi
else
  AMI_ID=$(aws ec2 describe-images --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" "Name=state,Values=available" \
    --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)
  USER_DATA=$(base64 -w0 "$ROOT/infra/ec2/user-data.sh" 2>/dev/null || base64 < "$ROOT/infra/ec2/user-data.sh" | tr -d '\n')

  echo "==> Launching EC2 ($AMI_ID)"
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Project,Value=$PROJECT_TAG},{Key=Role,Value=backend},{Key=Name,Value=aurora-backend}]" \
    --query 'Instances[0].InstanceId' --output text)
  aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
fi

EIP_ALLOC=$(aws ec2 describe-addresses --filters "Name=tag:Project,Values=$PROJECT_TAG" "Name=tag:Role,Values=backend-eip" \
  --query 'Addresses[0].AllocationId' --output text 2>/dev/null || true)

if [[ -z "$EIP_ALLOC" || "$EIP_ALLOC" == "None" ]]; then
  echo "==> Allocating Elastic IP"
  EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
  aws ec2 create-tags --resources "$EIP_ALLOC" --tags "Key=Project,Value=$PROJECT_TAG" "Key=Role,Value=backend-eip"
fi

CURRENT_ASSOC=$(aws ec2 describe-addresses --allocation-ids "$EIP_ALLOC" --query 'Addresses[0].InstanceId' --output text)
if [[ "$CURRENT_ASSOC" == "None" || -z "$CURRENT_ASSOC" ]]; then
  aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$EIP_ALLOC" >/dev/null
fi

PUBLIC_IP=$(aws ec2 describe-addresses --allocation-ids "$EIP_ALLOC" --query 'Addresses[0].PublicIp' --output text)
SSLIP_HOST="${PUBLIC_IP//./-}.sslip.io"
API_URL="https://${SSLIP_HOST}"

mkdir -p "$ROOT/infra/ec2"
cat > "$ROOT/infra/ec2/instance.env" <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
AURORA_PUBLIC_HOST=$SSLIP_HOST
AURORA_API_URL=$API_URL
AURORA_WS_URL=wss://${SSLIP_HOST}/ws/live
SSH_KEY=$HOME/synapse-enclave-key.pem
SSH_USER=ec2-user
EOF

echo "AURORA_PUBLIC_HOST=$SSLIP_HOST" > "$ROOT/infra/ec2/caddy.env"

echo ""
echo "Instance: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "API URL:   $API_URL"
echo "WS URL:    wss://${SSLIP_HOST}/ws/live"
echo "Saved:     infra/ec2/instance.env"
echo ""
echo "Next: ./scripts/deploy-ec2-backend.sh"
