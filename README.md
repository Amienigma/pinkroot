# PINKROOT

![PINKROOT](public/cover.jpg)

*I remember every moment with you.*

**Live:** https://amienigma.github.io/pinkroot/

A pink-on-black AI gateway console: API keys, providers, plugins, a terminal, logs and settings, all in one React app. Every key, provider and number in it is demo data until you connect it to your own Linux box.

## Run it locally (demo)
```bash
npm install
npm run dev
```

## Run on your own Linux server

Paste this one line into Ubuntu (including the Linux Installer app on Android):

```bash
curl -fsSL https://raw.githubusercontent.com/Amienigma/pinkroot/main/install.sh | bash
```

The script installs curl, git, build tools, Python 3 and Node.js 20+ if needed, clones this repo to `~/pinkroot`, builds the app, installs the server, and starts it with `nohup` at http://localhost:8108. It generates a password once and prints it in that same terminal (saved in `~/pinkroot/server/.env`, not printed again on later runs).

Then open the URL, click the Wi-Fi icon (**Connect to server**), leave the server URL as `http://localhost:8108`, and paste the password. After you connect, the Terminal tab is a real bash session on that machine and the dashboard shows live host stats (hostname, uptime, load, memory, CPUs). The password is never stored in the browser — only the login token.

Restart later with:

```bash
~/pinkroot/start.sh
```

Stop it with `kill $(cat ~/pinkroot/pinkroot.pid)`. Change the password any time in `~/pinkroot/server/.env` (`PINKROOT_PASSWORD`), then run `~/pinkroot/start.sh` again.

There is no systemd unit (so this works inside proot / Linux Installer). Keep the Linux session open; Android may kill background processes when the app is closed or the phone sleeps. `node-pty` has to compile a native module — if that fails on ARM/proot, the site still starts and the terminal will show a rebuild hint.
