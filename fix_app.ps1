$content = Get-Content src/App.jsx -Raw
$imports = ($content | Select-String -Pattern "^import.*" -AllMatches).Matches.Value -join "
"
$rest = $content -replace "^import.*
?", ""
$final = $imports + "
" + $rest
Set-Content src/App.jsx -Value $final
