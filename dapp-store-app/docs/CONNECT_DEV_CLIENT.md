# Connect the dev client to Metro

**Do not use `localhost`** — on the device, localhost is the device itself, not your computer. Metro runs on your computer, so you must use a URL that points to it.

## 1. Start Metro on your computer

In a terminal, from this folder:

```bash
cd dapp-store-app
npm start
```

Leave this running. Wait until you see "Metro waiting on ..." and the QR code / URL.

## 2. Enter the right URL in the app

On the **connection screen** in the dev client, **clear any "localhost" URL** and type one of these instead, then tap Connect.

- **Android emulator** (e.g. Android Studio AVD):  
  Use this exactly (no localhost):
  ```
  http://10.0.2.2:8083
  ```
  `10.0.2.2` is how the emulator reaches your Mac.

- **Physical Android device** (same Wi‑Fi as your Mac):  
  1. On your Mac: **System Settings → Network → Wi‑Fi** and note your IP (e.g. `192.168.1.105`).
  2. In the app enter (use your real IP):
     ```
     http://192.168.1.XXX:8083
     ```
     Example: `http://192.168.1.105:8083`

Port must be **8083**. If the app shows `localhost:8083`, replace it with the URL above — **localhost will always refuse to connect** from the device.

## 3. If it still fails

- Confirm Metro is running and shows no errors.
- Emulator: ensure it’s the same machine as Metro (no remote emulator).
- Phone: same Wi‑Fi as the Mac; try turning the phone’s Wi‑Fi off and on.
- Firewall: allow Node/Metro on port 8083 if you have a firewall.
