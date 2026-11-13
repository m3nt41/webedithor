@echo off
rem Abre el editor sin servidor (hay que haber corrido npm run build antes).
start "" "%~dp0distditor.html"
