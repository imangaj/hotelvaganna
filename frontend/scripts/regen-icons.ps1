Add-Type -AssemblyName System.Drawing
$srcPath = "d:\prog\pms-system\frontend\public\logo.png"
$img = [System.Drawing.Image]::FromFile($srcPath)
$size = [Math]::Min($img.Width, $img.Height)
$x = [Math]::Floor(($img.Width - $size) / 2)
$y = [Math]::Floor(($img.Height - $size) / 2)
$crop = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage(
  $img,
  (New-Object System.Drawing.Rectangle 0, 0, $size, $size),
  (New-Object System.Drawing.Rectangle $x, $y, $size, $size),
  [System.Drawing.GraphicsUnit]::Pixel
)
$g.Dispose()
$img.Dispose()

function Save-Resized($bitmap, $outPath, $w, $h) {
  $resized = New-Object System.Drawing.Bitmap $w, $h
  $g2 = [System.Drawing.Graphics]::FromImage($resized)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g2.DrawImage($bitmap, 0, 0, $w, $h)
  $g2.Dispose()
  $resized.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $resized.Dispose()
}

$public = "d:\prog\pms-system\frontend\public"
Save-Resized $crop (Join-Path $public "logo-512.png") 512 512
Save-Resized $crop (Join-Path $public "logo-192.png") 192 192
Save-Resized $crop (Join-Path $public "apple-touch-icon.png") 180 180
Save-Resized $crop (Join-Path $public "favicon-32.png") 32 32
$crop.Dispose()
