$ErrorActionPreference = "Stop"

Write-Host "Cleaning macOS metadata sidecar files"
Get-ChildItem -Path . -Recurse -Force -Filter "._*" -File | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Installing dependencies"
npm install

Write-Host "Running tests"
npm test

if ($IsMacOS) {
  Write-Host "Building macOS installer"
  npm run build:mac
}
elseif ($IsLinux) {
  Write-Host "Building Linux packages"
  npm run build:linux
}
elseif ($IsWindows) {
  Write-Host "Building Windows installer"
  npm run build:win
}
else {
  Write-Host "Unknown platform, running generic build"
  npm run build
}

Write-Host "Done"
