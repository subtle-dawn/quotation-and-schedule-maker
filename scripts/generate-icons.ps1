Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
function Draw-Icon($size, $name) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#536b50'))
  $graphics.ScaleTransform($size / 512.0, $size / 512.0)
  function Rounded($x, $y, $w, $h, $r, $color) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $r * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc(($x+$w-$diameter), $y, $diameter, $diameter, 270, 90)
    $path.AddArc(($x+$w-$diameter), ($y+$h-$diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($x, ($y+$h-$diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
    $graphics.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
  }
  function Line($color, $width, $points) {
    $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($color)), $width
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($pen, [System.Drawing.PointF[]]$points)
    $pen.Dispose()
  }
  Rounded 126 104 222 288 24 '#f7f8f0'
  Line '#78916c' 18 @([System.Drawing.PointF]::new(166,170), [System.Drawing.PointF]::new(306,170))
  Line '#78916c' 18 @([System.Drawing.PointF]::new(166,212), [System.Drawing.PointF]::new(250,212))
  Rounded 218 252 174 142 22 '#c6a47d'
  Line '#536b50' 12 @([System.Drawing.PointF]::new(224,292), [System.Drawing.PointF]::new(386,292))
  Line '#fffaf1' 17 @([System.Drawing.PointF]::new(260,339), [System.Drawing.PointF]::new(287,364), [System.Drawing.PointF]::new(344,316))
  $bitmap.Save((Join-Path $iconDirectory $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
Draw-Icon 192 'icon-192.png'
Draw-Icon 512 'icon-512.png'
Draw-Icon 512 'icon-maskable-512.png'
Draw-Icon 180 'apple-touch-icon.png'
