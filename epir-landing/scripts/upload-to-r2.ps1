<#
Upload-to-R2 PowerShell helper
Usage:
  .\upload-to-r2.ps1 -LocalDir "d:\images-to-upload" -Bucket "autorag-epir-website-rag-0b92dc" -Prefix "rings"

Requirements:
- Wrangler CLI installed and authenticated (wrangler login)
- wrangler v1+ that supports `wrangler r2 object put`
#>
param(
  [Parameter(Mandatory=$true)] [string]$LocalDir,
  [Parameter(Mandatory=$false)] [string]$Bucket = "autorag-epir-website-rag-0b92dc",
  [Parameter(Mandatory=$false)] [string]$Prefix = "",
  [Parameter(Mandatory=$false)] [string]$Wrangler = "wrangler"
)

if (-not (Test-Path $LocalDir)) {
  Write-Error "LocalDir '$LocalDir' does not exist"
  exit 1
}

# Normalize prefix
if ($Prefix -ne "" -and $Prefix.EndsWith('/')) { $Prefix = $Prefix.TrimEnd('/') }

Get-ChildItem -Path $LocalDir -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($LocalDir.Length).TrimStart('\','/') -replace '\\','/'
  $remotePath = if ($Prefix -ne "") { "$Prefix/$relative" } else { $relative }
  $remoteKey = "$Bucket/$remotePath"
  Write-Host "Uploading: $($_.FullName) -> $remotePath"

  $cmd = "$Wrangler r2 object put $remoteKey --file=`"$($_.FullName)`""
  Write-Host "Running: $cmd"
  $proc = Start-Process -FilePath $Wrangler -ArgumentList "r2","object","put",$remoteKey,"--file=$($_.FullName)" -NoNewWindow -Wait -PassThru

  if ($proc.ExitCode -ne 0) {
    Write-Warning "Upload failed for $($_.FullName) (exit $($proc.ExitCode))"
  } else {
    Write-Host "Uploaded: $remotePath"
  }
}

Write-Host "Done. Public URL pattern (example): https://pub-<ACCOUNT_ID>.r2.dev/<prefix>/<file>"
Write-Host "If you want files accessible via Pages without re-deploy, ensure R2 bucket has public access or use a worker to serve them."