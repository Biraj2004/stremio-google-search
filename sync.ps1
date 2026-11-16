Copy-Item -Path "shared\*" -Destination "firefox\" -Recurse -Force
Copy-Item -Path "shared\*" -Destination "chrome\" -Recurse -Force
Write-Host "==== Sync Done ===="
