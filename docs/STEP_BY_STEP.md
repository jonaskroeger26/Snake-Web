# Step by step – Which program to open and what to do

Do these in order. Each step says **which program** to use and **what to do** there.

---

## PART 1: Run the app on your phone

### Step 1
**Program:** **Cursor** (you’re already here)  
**Do this:** Press **Ctrl+`** (or **Cmd+`** on Mac) to open the Terminal at the bottom of Cursor.  
You should see a black or white box with a line of text and a blinking cursor.

---

### Step 2
**Program:** **Terminal** (the box that just opened in Cursor)  
**Do this:** Click inside the terminal, then type or paste this and press **Enter**:
```bash
cd "/Users/jonaskroeger/Downloads/snake-dapp 2/dapp-store-app"
```
You should see the line of text change so it ends with `dapp-store-app`. That means you’re in the right folder.

---

### Step 3
**Program:** **Terminal** (same box)  
**Do this:** Type or paste this and press **Enter**:
```bash
npm install
```
Wait until it finishes. You’ll see a lot of lines; when the cursor comes back and you can type again, it’s done.  
If you see red “error” lines, tell me what they say. Otherwise go to Step 4.

---

### Step 4
**Program:** **Terminal** (same box)  
**Do this:** Type or paste this and press **Enter**:
```bash
npx expo start
```
A **QR code** will appear in the terminal, and maybe a browser tab will open. **Leave this running.** Don’t close the terminal and don’t press Ctrl+C yet.

---

### Step 5
**Program:** Your **Android phone**  
**Do this:**
1. Unlock the phone.
2. Open the **Play Store**.
3. Search for **Expo Go** and install it.
4. Make sure the phone is on the **same Wi‑Fi** as your computer.

---

### Step 6
**Program:** **Expo Go** (on your phone)  
**Do this:**
1. Open the **Expo Go** app.
2. Tap **“Scan QR code”** (or the scan icon).
3. Point the camera at the **QR code** that is showing in the **Cursor terminal** (or in the browser tab that opened).
4. When it loads, your Snake game should open inside the app.

You’re done with Part 1. The game is running on your phone.

To stop the server later: click the **Terminal** in Cursor and press **Ctrl+C** (or **Cmd+C** on Mac).

---

## PART 2: Build the APK for the dApp Store (do this when you want to publish)

### Step 7
**Program:** **Web browser** (Chrome, Safari, etc.)  
**Do this:**
1. Go to **https://expo.dev/signup**
2. Sign up with your email (or GitHub). Remember your password.

---

### Step 8
**Program:** **Terminal in Cursor** (same one you used before)  
**Do this:**  
If the Expo server is still running from Step 4, press **Ctrl+C** (or **Cmd+C**) to stop it.  
Then type or paste and press **Enter**:
```bash
npm install -g eas-cli
```
Wait until it finishes.

---

### Step 9
**Program:** **Terminal in Cursor**  
**Do this:** Type and press **Enter**:
```bash
eas login
```
When it asks for email and password, use the **Expo account** you created in Step 7. When it says you’re logged in, you’re good.

---

### Step 10
**Program:** **Terminal in Cursor**  
**Do this:** Make sure you’re in the right folder. Paste and press **Enter**:
```bash
cd "/Users/jonaskroeger/Downloads/snake-dapp 2/dapp-store-app"
```
Then paste and press **Enter**:
```bash
eas init
```
When it asks to link to an existing project, choose **No** (or “Create new”).  
It will print a **Project ID** (a long string like `1a2b3c4d-5e6f-7890-abcd-ef1234567890`). **Copy that whole ID** (select it and copy).

---

### Step 11
**Program:** **Cursor** (the code editor, not the terminal)  
**Do this:**
1. In the left sidebar, open the folder **dapp-store-app**.
2. Click the file **app.json** to open it.
3. Find the line that says: `"projectId": "YOUR_EAS_PROJECT_ID"`.
4. Select **YOUR_EAS_PROJECT_ID** (just that part between the quotes).
5. Paste (Ctrl+V or Cmd+V) so it’s replaced by the Project ID you copied in Step 10.
6. Save the file (**Ctrl+S** or **Cmd+S**).

---

### Step 12
**Program:** **Terminal in Cursor**  
**Do this:** Type or paste and press **Enter**:
```bash
eas build -p android --profile dapp-store
```
Answer the questions (you can press Enter to accept defaults). The build runs on Expo’s servers. Wait **10–20 minutes**. When it’s done, it will show a **link**. Copy that link.

---

### Step 13
**Program:** **Web browser**  
**Do this:** Paste the link you copied into the address bar and press Enter. On that page, **download the .apk file** to your computer. That’s the file you’ll upload to the dApp Store.

---

### Step 14
**Program:** **Web browser**  
**Do this:**
1. Go to **https://publish.solanamobile.com**
2. Sign up or log in.
3. Connect your Solana wallet (e.g. Phantom).
4. Add your dApp (name, description, screenshots).
5. When they ask for the app file, **upload the .apk** you downloaded in Step 13.
6. Complete the rest of their form and submit.

---

## Quick reference – which program for what

| Step | Program          | What you do there                          |
|------|------------------|--------------------------------------------|
| 1    | Cursor           | Open Terminal (Ctrl+` or Cmd+`)            |
| 2–4  | Terminal (Cursor)| Run `cd`, `npm install`, `npx expo start`  |
| 5    | Phone            | Install Expo Go from Play Store            |
| 6    | Expo Go (phone)  | Scan QR code → see your game                |
| 7    | Browser          | Sign up at expo.dev                         |
| 8–10 | Terminal (Cursor)| Install EAS, `eas login`, `eas init`       |
| 11   | Cursor           | Edit app.json, paste Project ID, save      |
| 12   | Terminal (Cursor)| Run `eas build -p android --profile dapp-store` |
| 13   | Browser          | Open build link, download .apk              |
| 14   | Browser          | publish.solanamobile.com, upload .apk       |

Start with **Step 1** and go in order. If any step doesn’t work, tell me the step number and what you see (or the error message).
