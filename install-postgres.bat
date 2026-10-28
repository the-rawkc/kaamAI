@echo off
"%TEMP%\postgresql-17.exe" --mode unattended --prefix "C:\Program Files\PostgreSQL\17" --serverport 5432 --superuser postgres --superuserpassword KaamAI_Pg_2026 --locale en_US --servicename postgresql17 --servicedisplayname "PostgreSQL Server 17" --servicedescription "PostgreSQL Server 17"
echo Installer exit code: %ERRORLEVEL%