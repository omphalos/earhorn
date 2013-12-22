cd ..
python -m SimpleHTTPServer &
cd ./earhorn
nodemon --exec ./bundle.sh --ext js

