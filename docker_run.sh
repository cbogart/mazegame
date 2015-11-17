docker build -t cbogart/mazegame:v1 .
docker run -d -p 8080:8080 -v `pwd`/logs:/usr/src/app/logs cbogart/mazegame:v1
