param(
    [ValidateSet("daily", "weekly", "both")]
    [string]$Mode = "daily",
    [string]$HostName = "187.124.20.219",
    [string]$User = "root"
)

$ErrorActionPreference = "Stop"

switch ($Mode) {
    "daily" {
        ssh "$User@$HostName" "/root/backups/backup_daily.sh; ls -lh /root/backups/daily | tail -n 5"
    }
    "weekly" {
        ssh "$User@$HostName" "/root/backups/backup_weekly.sh; ls -lh /root/backups/weekly | tail -n 5"
    }
    "both" {
        ssh "$User@$HostName" "/root/backups/backup_daily.sh; /root/backups/backup_weekly.sh; ls -lh /root/backups/daily | tail -n 3; ls -lh /root/backups/weekly | tail -n 3"
    }
}

Write-Host "Backup trigger completed ($Mode)." -ForegroundColor Green
