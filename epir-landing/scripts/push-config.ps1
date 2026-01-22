<#
push-config.ps1
Wysyła JSON config (domyślnie `config-final.json`) do endpointu `/api/save` lub `/api/init` na stronie Pages.
Usage:
  .\push-config.ps1 -PagesDomain "twoja-domena.pages.dev" -UseInit:$false -ConfigPath "config-final.json"

Notes:
- Jeśli Cloudflare Access jest włączone, uruchom skrypt w sesji, która ma uprawnienia (np. curl z Cf-Access cookie) albo wykonaj ręcznie z przeglądarki.
#>
param(
  [Parameter(Mandatory=$true)] [string]$PagesDomain,
  [Parameter(Mandatory=$false)] [string]$ConfigPath = "config-final.json",
  [Parameter(Mandatory=$false)] [switch]$UseInit
)

$baseUrl = "https://$PagesDomain"

if (-not (Test-Path $ConfigPath)) {
  Write-Error "Config file '$ConfigPath' not found"
  exit 1
}

$json = Get-Content -Raw -Path $ConfigPath

if ($UseInit) {
  $url = "$baseUrl/api/init"
  Write-Host "POST -> $url (init)"
} else {
  $url = "$baseUrl/api/save"
  Write-Host "POST -> $url (save)"
}

try {
  $resp = Invoke-RestMethod -Uri $url -Method Post -Body $json -ContentType 'application/json'
  Write-Host "Response:`n" (ConvertTo-Json $resp -Depth 5)
} catch {
  Write-Error "Request failed: $_"
}
