Add-Type -AssemblyName System.Drawing

function Generate-PwaIcon([int]$size, [string]$filePath, [bool]$maskable) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml('#080b11')
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Inner Emblem Card
    $margin = if ($maskable) { [int]($size * 0.15) } else { [int]($size * 0.08) }
    $cardSize = $size - ($margin * 2)
    $cardRadius = [int]($cardSize * 0.22)
    
    # Card Fill
    $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#101623'))
    $penWidth = [Math]::Max(1.0, [float]($size * 0.025))
    $cardPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#3b82f6'), $penWidth)
    
    # Draw rounded rect path
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($margin, $margin, $cardRadius, $cardRadius, 180, 90)
    $path.AddArc($margin + $cardSize - $cardRadius, $margin, $cardRadius, $cardRadius, 270, 90)
    $path.AddArc($margin + $cardSize - $cardRadius, $margin + $cardSize - $cardRadius, $cardRadius, $cardRadius, 0, 90)
    $path.AddArc($margin, $margin + $cardSize - $cardRadius, $cardRadius, $cardRadius, 90, 90)
    $path.CloseFigure()

    $g.FillPath($cardBrush, $path)
    $g.DrawPath($cardPen, $path)

    # Central Symbol: Gateway Letter 'G' with Node
    $fontFamily = New-Object System.Drawing.FontFamily('Segoe UI')
    $fontSize = [float]($size * 0.38)
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f8fafc'))
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $yOffset = [float]($margin - ($size * 0.02))
    $textRect = New-Object System.Drawing.RectangleF([float]$margin, $yOffset, [float]$cardSize, [float]$cardSize)
    $g.DrawString('G', $font, $textBrush, $textRect, $sf)

    # Accent Dot in Brand Blue
    $dotSize = [int]($size * 0.08)
    $dotX = [int]($margin + $cardSize * 0.70)
    $dotY = [int]($margin + $cardSize * 0.25)
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#38bdf8'))
    $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated $filePath"
}

Generate-PwaIcon 192 'public/icon-192.png' $false
Generate-PwaIcon 512 'public/icon-512.png' $false
Generate-PwaIcon 512 'public/icon-maskable-512.png' $true
Generate-PwaIcon 180 'public/apple-touch-icon.png' $false
