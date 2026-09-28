"""Sube el build de UNIKO-RD al VPS por SFTP.

Uso: VPS_PASS=<password> python scripts/vps-upload.py
"""

import os
import sys

import paramiko

HOST = "84.46.254.137"
USER = "root"
LOCAL = "uniko-deploy.tar.gz"
REMOTE = "/root/uniko-deploy.tar.gz"


def main() -> int:
    password = os.environ.get("VPS_PASS")
    if not password:
        print("ERROR: define VPS_PASS en el entorno", file=sys.stderr)
        return 2

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=25)
    try:
        sftp = client.open_sftp()
        sftp.put(LOCAL, REMOTE)
        size = sftp.stat(REMOTE).st_size
        print(f"Subido {REMOTE}: {size} bytes")
        sftp.close()
    finally:
        client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
