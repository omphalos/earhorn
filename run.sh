# ./earhorn/server/server.js --jsDir . --pattern "./earhorn/earhorn.*" --port 8001 --proxyPort 8000
cd ..
python -m SimpleHTTPServer &
cd ./earhorn
nodemon --exec ./bundle.sh --ext js

