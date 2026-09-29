@echo off
setlocal
cd /d "%~dp0"
python -c "import sqlite3; c=sqlite3.connect('data/bikerental.db'); print('Users:',c.execute('select count(*) from users').fetchone()[0]); print('Bikes:',c.execute('select count(*) from bikes').fetchone()[0]); print('Bookings:',c.execute('select count(*) from bookings').fetchone()[0]); print('Payments:',c.execute('select count(*) from payments').fetchone()[0]); print('Notifications:',c.execute('select count(*) from notifications').fetchone()[0]); print('Maintenance:',c.execute('select count(*) from maintenance').fetchone()[0]); print('Reviews:',c.execute('select count(*) from reviews').fetchone()[0]); print('Available bikes:',c.execute(\"select count(*) from bikes where status='Available'\").fetchone()[0]); c.close()"
pause
