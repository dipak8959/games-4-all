# games-4-all

## Diwali Lanterns (`diwali-lanterns/index.html`)

A full-screen animation of floating sky lanterns, flickering diyas, twinkling stars and fireworks.
It is one HTML file with no dependencies, so you can open it in any browser.

**Cast it to a TV or projector**
- **Chromecast / Google TV:** open the page in Chrome, then use ⋮ → *Cast…* → *Cast tab* and press **Fullscreen**.
- **AirPlay (iPhone/Mac):** open it in Safari, use Screen Mirroring, and press **Fullscreen**.
- **HDMI:** plug the laptop into the projector and press `F`.
- **No casting:** press **Record 30s video** and play the downloaded file from a USB stick.

**Controls:** tap the sky to launch a firework, tap near the bottom to release a lantern.
Keys: `F` fullscreen, `Space` pause, `Enter` firework.

**Make a video file** (for iPad full screen or a USB stick):
`node tools/render-video.js diwali-lanterns/index.html diwali.mp4 120` renders a 2-minute 2048×1536 MP4.
For a 1080p TV version, pass `120 30 960 540`.
