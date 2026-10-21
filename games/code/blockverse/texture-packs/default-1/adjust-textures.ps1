Add-Type -AssemblyName System.Drawing

function Convert-HexColor([string]$hex) {
    return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Update-Palette([string]$path, [hashtable]$replacements) {
    $bitmap = [System.Drawing.Bitmap]::new($path)
    try {
        for ($y = 0; $y -lt $bitmap.Height; $y++) {
            for ($x = 0; $x -lt $bitmap.Width; $x++) {
                $current = $bitmap.GetPixel($x, $y)
                $key = $current.Name.ToUpperInvariant()
                if ($replacements.ContainsKey($key)) {
                    $bitmap.SetPixel($x, $y, (Convert-HexColor $replacements[$key]))
                }
            }
        }
        $temporaryPath = "$path.updated.png"
        $bitmap.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $bitmap.Dispose()
    }
    Move-Item -LiteralPath $temporaryPath -Destination $path -Force
}

$grassColors = @{
    'FF55B843' = '#479F3B'
    'FF79D451' = '#65BA48'
    'FF369A3E' = '#2E8736'
    'FFA8E15C' = '#8DCA50'
}

$stoneColors = @{
    'FF8B93A4' = '#929497'
    'FFA7AFC0' = '#B2B3B5'
    'FF6E7688' = '#727477'
    'FFC5CAD5' = '#D0D1D2'
}

foreach ($name in @('grass1.png', 'grass2.png', 'grass3.png', 'grass5.png')) {
    Update-Palette (Join-Path $PSScriptRoot $name) $grassColors
}

1..5 | ForEach-Object {
    Update-Palette (Join-Path $PSScriptRoot "stone$_.png") $stoneColors

    $bedrockPath = Join-Path $PSScriptRoot "bedrock$_.png"
    $bitmap = [System.Drawing.Bitmap]::new($bedrockPath)
    try {
        $white = Convert-HexColor '#E4E2DC'
        $offset = $_ - 1
        $points = @(
            @(2 + ($offset % 2), 2),
            @(11, 4 + ($offset % 3)),
            @(5 + ($offset % 4), 11),
            @(13, 13 - ($offset % 2))
        )
        foreach ($point in $points) {
            $bitmap.SetPixel($point[0], $point[1], $white)
        }
        $temporaryPath = "$bedrockPath.updated.png"
        $bitmap.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $bitmap.Dispose()
    }
    Move-Item -LiteralPath $temporaryPath -Destination $bedrockPath -Force
}
