# Navigate to secrets folder
cd backend\secrets\bankid

# Read the combined PEM file
$content = Get-Content "FPTestcert5_20240610.pem" -Raw

# Split into certificate and key
$certMatch = [regex]::Match($content, '(-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$keyMatch = [regex]::Match($content, '(-----BEGIN .*PRIVATE KEY-----.*?-----END .*PRIVATE KEY-----)', [System.Text.RegularExpressions.RegexOptions]::Singleline)

# Write certificate
$certMatch.Value | Out-File -FilePath "test_cert.pem" -Encoding ASCII -NoNewline

# Write private key
$keyMatch.Value | Out-File -FilePath "test_key.pem" -Encoding ASCII -NoNewline

Write-Host "✅ Certificate split successfully!"
Write-Host "✅ Created: test_cert.pem"
Write-Host "✅ Created: test_key.pem"
