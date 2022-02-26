:: zip files without filtering, not recommended
:: transform scss to css
sass --update unpacked/popup & powershell Compress-Archive unpacked\* Youtube-Volume-Scroll.zip -Force
