@title Twitch Tools
@start "PHP" /B core\php\php.exe >nul 2>&1 -S 127.0.0.1:80 -t "%cd%"
@start "" http://127.0.0.1:80/core/index.php
@ECHO Twitch Tools is accessible through any web browser at 127.0.0.1:80.
@ECHO This window needs to be open when you are live streaming.
@ECHO [1;7mClose this window to stop your AllChatBot server. If you are currently using AllChatBot or live streaming, leave this page open.[0m