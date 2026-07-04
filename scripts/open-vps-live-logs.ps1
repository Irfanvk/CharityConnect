param(
    [ValidateSet("backend", "nginx", "both", "connections")]
    [string]$Mode = "both",
    [string]$HostName = "187.124.20.219",
    [string]$User = "root"
)

$ErrorActionPreference = "Stop"

switch ($Mode) {
    "backend" {
        ssh "$User@$HostName" "journalctl -u charity.service -f"
    }
    "nginx" {
        ssh "$User@$HostName" "tail -f /var/log/nginx/access.log"
    }
    "both" {
        ssh "$User@$HostName" "bash -lc 'echo === BACKEND LOGS ===; journalctl -u charity.service -n 40 --no-pager; echo; echo === NGINX ACCESS LOGS ===; tail -n 40 /var/log/nginx/access.log; echo; echo Press Ctrl+C to stop; echo; tail -f /var/log/nginx/access.log'"
    }
    "connections" {
        ssh "$User@$HostName" "watch -n 2 'ss -tnp | grep -E \":80|:443|:8000\" || true'"
    }
}
