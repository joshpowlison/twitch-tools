@title Streamer Tools by Josh Powlison
@start "PHP" /B core\php\php.exe >nul 2>&1 -S 127.0.0.1:81 -t "%cd%"
@start "" http://127.0.0.1:81/core/index.php
@start "SOCKET" /B core\php\php.exe -q core\interconnect-socket.php
REM core\php\php.exe -q core\interconnect-socket.php

@ECHO Streamer Tools by Josh Powlison is accessible through any web browser at 127.0.0.1:80.
@ECHO This window needs to be open when you are live streaming.
@ECHO [1;7mClose this window to stop your Streamer Tools by Josh Powlison server. If you are currently using Streamer Tools by Josh Powlison or live streaming, leave this page open.[0m