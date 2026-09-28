"""Helper SSH para el VPS de UNIKO-RD.

Uso:
    VPS_PASS=<password> python scripts/vps-ssh.py "<comando>"

Requiere la variable de entorno VPS_PASS con la contrasena de root.
La contrasena nunca se guarda en este archivo.
"""

import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import paramiko

HOST = "84.46.254.137"
USER = "root"


def main() -> int:
    password = os.environ.get("VPS_PASS")
    if not password:
        print("ERROR: define VPS_PASS en el entorno", file=sys.stderr)
        return 2

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=password, timeout=25, banner_timeout=25)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR de conexion: {exc}", file=sys.stderr)
        return 3

    try:
        command = sys.argv[1] if len(sys.argv) > 1 else "echo ok"
        stdin, stdout, stderr = client.exec_command(command, timeout=600)
        out = stdout.read().decode("utf-8", "replace")
        err = stderr.read().decode("utf-8", "replace")
        code = stdout.channel.recv_exit_status()
        if out:
            print(out)
        if err:
            print(err, file=sys.stderr)
        return code
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
