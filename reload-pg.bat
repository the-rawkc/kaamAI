@echo off
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\17\data"
echo Exit code: %ERRORLEVEL%