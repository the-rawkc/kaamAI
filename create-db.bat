@echo off
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres -c "CREATE DATABASE kaamai;"
echo Exit code: %ERRORLEVEL%