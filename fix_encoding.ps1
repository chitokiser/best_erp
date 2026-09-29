Get-ChildItem -Path admin -Filter *.html | ForEach-Object {
    $textUtf8 = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    if ($textUtf8.Contains([char]65533)) {
        Write-Host "Fixing $($_.Name)"
        $textDefault = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::Default)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($_.FullName, $textDefault, $utf8NoBom)
    }
}
