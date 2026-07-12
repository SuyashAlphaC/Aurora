#!/bin/bash
set -euxo pipefail
exec > /var/log/aurora-user-data.log 2>&1

dnf update -y
dnf install -y docker git rsync
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

mkdir -p /opt/aurora
chown ec2-user:ec2-user /opt/aurora

touch /var/log/aurora-bootstrap-done
