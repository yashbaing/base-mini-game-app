# How to Run the Game

## Quick Start

### Option 1: Using Python (Already Running)
The server is already running on port 8000. Access the game at:

**On your computer:**
- http://localhost:8000
- http://127.0.0.1:8000

**On your mobile device (same WiFi network):**
- http://[YOUR_LOCAL_IP]:8000
  - Replace [YOUR_LOCAL_IP] with your computer's local IP address
  - Example: http://192.168.1.100:8000

### Option 2: Manual Start
If the server stops, restart it with:

```bash
cd "/Users/yashbaing/Documents/base mini game"
python3 -m http.server 8000
```

### Option 3: Using Node.js (if Python not available)
```bash
cd "/Users/yashbaing/Documents/base mini game"
npx http-server -p 8000 -c-1
```

## Accessing from Mobile Device

1. **Make sure your mobile device is on the same WiFi network as your computer**
2. **Find your computer's local IP address:**
   - Mac: System Preferences > Network > Status (shows IP address)
   - Or run: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. **Open your mobile browser and go to:** `http://[YOUR_LOCAL_IP]:8000`

## Troubleshooting

### "This site can't be reached"
- ✅ Check if server is running: Open http://localhost:8000 in your browser
- ✅ Make sure mobile device is on same WiFi network
- ✅ Check firewall settings (allow port 8000)
- ✅ Try accessing from computer first: http://localhost:8000

### Port Already in Use
If port 8000 is busy, use a different port:
```bash
python3 -m http.server 8080
```
Then access at: http://localhost:8080

### Game Not Loading
- Open browser console (F12 or right-click > Inspect > Console)
- Check for JavaScript errors
- Make sure all files are accessible
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Current Server Status
✅ Server is running on port 8000
✅ All files are accessible
✅ Game should be playable at: http://localhost:8000
