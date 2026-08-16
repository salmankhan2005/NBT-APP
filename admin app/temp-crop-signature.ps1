$src = 'C:\Users\krith\AppData\Roaming\Code\User\workspaceStorage\vscode-chat-images\image-1785575823238.jpeg'
$dst = 'assets/signatures/nbt-authorised-signature.png'
$dstDir = Split-Path $dst
if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir | Out-Null
}
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile($src)
$width = $img.Width
$height = $img.Height
$minx = $width
$miny = $height
$maxx = -1
$maxy = -1
for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
        $c = $img.GetPixel($x, $y)
        if (-not ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240)) {
            if ($x -lt $minx) { $minx = $x }
            if ($y -lt $miny) { $miny = $y }
            if ($x -gt $maxx) { $maxx = $x }
            if ($y -gt $maxy) { $maxy = $y }
        }
    }
}
if ($maxx -ge $minx -and $maxy -ge $miny) {
    $rect = [System.Drawing.Rectangle]::FromLTRB($minx, $miny, $maxx + 1, $maxy + 1)
    $cropped = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
    $graphics = [System.Drawing.Graphics]::FromImage($cropped)
    $graphics.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    for ($x = 0; $x -lt $cropped.Width; $x++) {
        for ($y = 0; $y -lt $cropped.Height; $y++) {
            $c = $cropped.GetPixel($x, $y)
            if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
                $cropped.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
            }
        }
    }
    $cropped.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
} else {
    $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
}
$img.Dispose()
Write-Host "saved $dst"