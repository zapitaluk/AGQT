$WshShell = New-Object -ComObject WScript.Shell
$StartupFolder = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupFolder "Antigravity Quota.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $PSScriptRoot "antigravity-quota-silent.vbs"
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Save()

Write-Host "Startup shortcut created at: $ShortcutPath"
Write-Host "The app will now start automatically when you log in (no window)."
