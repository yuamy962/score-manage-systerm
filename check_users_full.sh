#!/bin/bash
cd /home/ubuntu/score-manage-systerm/backend
PGPASSWORD=QH_bss_0971 psql -h localhost -p 5432 -U scoreuser -d scoremanage -c "SELECT id, username, name, role FROM users;"
