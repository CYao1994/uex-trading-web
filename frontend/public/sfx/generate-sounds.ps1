# Generate sci-fi UI sound effects using ffmpeg synthesis
$ffmpeg = "C:\Users\GUNDA\AppData\Local\Temp\ffmpeg-extract\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
$dir = "C:\Users\GUNDA\uex-trading-web-main\frontend\public\sfx\individual"

# nav_click - crisp HUD beep (200ms, 800Hz → 1200Hz sweep)
& $ffmpeg -y -f lavfi -i "sine=frequency=800:duration=0.2" -af "volume=0.3,afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.05" "$dir\nav_click.wav" 2>$null

# page_transition - whoosh sweep (400ms, frequency sweep up)
& $ffmpeg -y -f lavfi -i "sine=frequency=400:duration=0.4" -af "volume=0.25,asetrate=44100*1.5,atempo=0.7,afade=t=in:d=0.05,afade=t=out:st=0.3:d=0.1" "$dir\page_transition.wav" 2>$null

# button_hover - subtle blip (100ms, 1000Hz)
& $ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=0.1" -af "volume=0.15,afade=t=in:d=0.005,afade=t=out:st=0.06:d=0.04" "$dir\button_hover.wav" 2>$null

# button_click - confirm click (200ms, 600Hz + 900Hz)
& $ffmpeg -y -f lavfi -i "sine=frequency=600:duration=0.2" -f lavfi -i "sine=frequency=900:duration=0.2" -filter_complex "[0][1]amix=inputs=2:duration=first,volume=0.35,afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.08" "$dir\button_click.wav" 2>$null

# toggle_on - ascending tone (180ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=500:duration=0.18" -af "volume=0.3,volume='if(between(t,0,0.09),0.8,1.2)':eval=frame,afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.06" "$dir\toggle_on.wav" 2>$null

# toggle_off - descending tone (180ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=800:duration=0.18" -af "volume=0.3,volume='if(between(t,0,0.09),1.2,0.7)':eval=frame,afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.06" "$dir\toggle_off.wav" 2>$null

# search_focus - lock-on blip (150ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1200:duration=0.15" -af "volume=0.2,afade=t=in:d=0.01,afade=t=out:st=0.1:d=0.05" "$dir\search_focus.wav" 2>$null

# search_type - tiny key tap (60ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1500:duration=0.06" -af "volume=0.1,afade=t=in:d=0.005,afade=t=out:st=0.03:d=0.03" "$dir\search_type.wav" 2>$null

# search_clear - erase sweep (250ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=0.25" -af "volume=0.2,asetrate=44100*0.7,atempo=1.2,afade=t=in:d=0.02,afade=t=out:st=0.15:d=0.1" "$dir\search_clear.wav" 2>$null

# filter_apply - switch confirm (200ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=700:duration=0.2" -af "volume=0.25,afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.08" "$dir\filter_apply.wav" 2>$null

# sort_change - light reorder (150ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=550:duration=0.15" -af "volume=0.2,afade=t=in:d=0.01,afade=t=out:st=0.1:d=0.05" "$dir\sort_change.wav" 2>$null

# data_loading - scan hum (500ms, low drone)
& $ffmpeg -y -f lavfi -i "sine=frequency=200:duration=0.5" -af "volume=0.15,tremolo=f=8:d=0.5,afade=t=in:d=0.1,afade=t=out:st=0.35:d=0.15" "$dir\data_loading.wav" 2>$null

# data_loaded - success chime (350ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=880:duration=0.35" -af "volume=0.3,afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.15" "$dir\data_loaded.wav" 2>$null

# data_error - warning blip (350ms, low)
& $ffmpeg -y -f lavfi -i "sine=frequency=250:duration=0.35" -af "volume=0.3,tremolo=f=4:d=0.8,afade=t=in:d=0.02,afade=t=out:st=0.2:d=0.15" "$dir\data_error.wav" 2>$null

# item_select - touch confirm (200ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=750:duration=0.2" -af "volume=0.25,afade=t=in:d=0.01,afade=t=out:st=0.12:d=0.08" "$dir\item_select.wav" 2>$null

# detail_open - panel expand (350ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=500:duration=0.35" -af "volume=0.25,asetrate=44100*1.3,atempo=0.8,afade=t=in:d=0.03,afade=t=out:st=0.2:d=0.15" "$dir\detail_open.wav" 2>$null

# detail_close - panel collapse (250ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=700:duration=0.25" -af "volume=0.2,asetrate=44100*0.8,atempo=1.1,afade=t=in:d=0.02,afade=t=out:st=0.15:d=0.1" "$dir\detail_close.wav" 2>$null

# favorite_add - star chime (300ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1100:duration=0.3" -af "volume=0.3,afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.15" "$dir\favorite_add.wav" 2>$null

# favorite_remove - unstar (200ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=600:duration=0.2" -af "volume=0.2,afade=t=in:d=0.01,afade=t=out:st=0.1:d=0.1" "$dir\favorite_remove.wav" 2>$null

# route_calculate - quantum scan (700ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=300:duration=0.7" -af "volume=0.2,tremolo=f=12:d=0.7,afade=t=in:d=0.1,afade=t=out:st=0.5:d=0.2" "$dir\route_calculate.wav" 2>$null

# route_found - success fanfare (500ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=660:duration=0.5" -f lavfi -i "sine=frequency=880:duration=0.5" -filter_complex "[0][1]amix=inputs=2:duration=first,volume=0.3,afade=t=in:d=0.02,afade=t=out:st=0.3:d=0.2" "$dir\route_found.wav" 2>$null

# profit_highlight - coin blip (250ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1200:duration=0.25" -af "volume=0.25,afade=t=in:d=0.005,afade=t=out:st=0.15:d=0.1" "$dir\profit_highlight.wav" 2>$null

# success - generic success (400ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=880:duration=0.4" -af "volume=0.3,afade=t=in:d=0.01,afade=t=out:st=0.25:d=0.15" "$dir\success.wav" 2>$null

# warning - warning tone (350ms, low)
& $ffmpeg -y -f lavfi -i "sine=frequency=300:duration=0.35" -af "volume=0.3,tremolo=f=3:d=0.9,afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.15" "$dir\warning.wav" 2>$null

# notification - ping (300ms)
& $ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=0.3" -af "volume=0.25,afade=t=in:d=0.005,afade=t=out:st=0.15:d=0.15" "$dir\notification.wav" 2>$null

Write-Output "Generated all individual sounds"
