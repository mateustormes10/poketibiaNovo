param(
  [string]$InputFile = "docs/Plano_de_Negocio_e_Roadmap.md",
  [string]$OutputFile = "docs/Plano_de_Negocio_e_Roadmap.pdf"
)

$ErrorActionPreference = "Stop"

Write-Host "Generating PDF: $InputFile -> $OutputFile"

# Uses npx to run md-to-pdf without installing globally.
# Requires internet on first run (downloads the package).

$inputFull = Resolve-Path $InputFile
$outputFull = Join-Path (Resolve-Path ".") $OutputFile

$defaultPdf = [System.IO.Path]::ChangeExtension($inputFull.Path, ".pdf")

if (Test-Path $defaultPdf) {
  Remove-Item -Force $defaultPdf
}

& npx --yes md-to-pdf $InputFile

if (!(Test-Path $defaultPdf)) {
  throw "PDF was not generated: $defaultPdf"
}

$outDir = Split-Path -Parent $outputFull
if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

Move-Item -Force $defaultPdf $outputFull

Write-Host "Done: $OutputFile"
