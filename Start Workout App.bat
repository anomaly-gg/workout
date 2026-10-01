@echo off
REM Starts the hidden local server (serve.pyw) if needed, then opens the app.
REM http://localhost is required for the in-app tutorial player (file:// blocks YouTube embeds).
cd /d "%~dp0"
netstat -ano | findstr /r /c:":8753 .*LISTENING" >nul || (
  where pythonw >nul 2>nul && (start "" pythonw serve.pyw) || (
    where pyw >nul 2>nul && (start "" pyw serve.pyw) || (
      echo Python was not found. Opening the file directly - tutorial videos will open on YouTube.
      start "" "%~dp0index.html"
      timeout /t 3 >nul
      exit /b
    )
  )
  timeout /t 1 >nul
)
start "" http://localhost:8753/index.html
