@echo off
set PGPASSWORD=KaamAI_Pg_2026
"C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -h localhost -p 5432 -U postgres
echo Exit code: %ERRORLEVEL%