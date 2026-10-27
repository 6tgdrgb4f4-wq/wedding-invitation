# Абылайхан & Наргиза — wedding invitation

A static invitation page (Kazakh / English) with a countdown, 2GIS and Yandex Maps links, "add to calendar", and an RSVP form. RSVPs are saved to a Google Sheet that only you can see.

Hosting and storage are both free: the page is on GitHub Pages and the replies go to Google Sheets through Apps Script.

```
index.html          page markup
css/style.css       design
js/config.js        settings: Apps Script URL, dates, map links  ← edit this
js/i18n.js          Kazakh and English texts                      ← edit texts here
js/main.js          language switch, countdown, RSVP logic
wedding.ics         calendar file for Apple Calendar and Outlook
apps-script/Code.gs Google Sheets backend (paste into Apps Script)
```

## 1. Set up the Google Sheet (RSVP storage)

1. Go to <https://sheets.new> and name the sheet, for example "Той — RSVP".
2. Open **Extensions → Apps Script**. Delete the sample code and paste the whole of [apps-script/Code.gs](apps-script/Code.gs). Save.
3. In the toolbar, choose the function **`setup`** and press **Run**. Allow access when Google asks: Advanced → Go to project → Allow.
   This creates two tabs:
   - **RSVP**: one row per guest.
   - **Summary**: counts of who is coming, who is not, and the total number of guests, plus lists of names.
4. Click **Deploy → New deployment**, then the gear icon → **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and copy the **Web app URL** (it ends with `/exec`).
6. Paste the URL into [js/config.js](js/config.js):
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
   ```

"Anyone" means the page can send replies to the script. It does **not** make the sheet public. Only your Google account can open the sheet.

If you change `Code.gs` later, go to **Deploy → Manage deployments → Edit → Version: New version → Deploy**. This keeps the same URL.

## 2. Publish on GitHub Pages

1. Create a public repository on GitHub, for example `wedding-invitation`.
2. Push these files:
   ```sh
   git init
   git add .
   git commit -m "Wedding invitation"
   git branch -M main
   git remote add origin https://github.com/<username>/wedding-invitation.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages → Build and deployment**. Choose Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, then Save.
4. After about a minute the site is live at `https://<username>.github.io/wedding-invitation/`.

To open the page in English directly, add `?lang=en` to the link: `https://<username>.github.io/wedding-invitation/?lang=en`

## 3. Check before sending

1. Open the site on your phone and send a test RSVP. Check that a row appears in the **RSVP** tab.
2. Delete the test row.
3. Then send the link to your guests.

## Who is coming

Open the Google Sheet:

- **Summary**: the number of yes and no replies, the total number of guests (each guest plus their companions), and the lists of names.
- **RSVP**: the raw replies with timestamps.

If a guest clicks **"Жауапты өзгерту / Change my answer"** on the same phone, their existing row is updated instead of a new one being added.

## Closing date

RSVP closes at **27 Dec 2026, 23:59 (Almaty)**. After that:

- the page still shows all the details, but the form is replaced by an "RSVP closed" message
- the Apps Script rejects any late replies

The closing date is set in two places, and they must match:

- `RSVP_DEADLINE` in [js/config.js](js/config.js)
- `DEADLINE` in [apps-script/Code.gs](apps-script/Code.gs)

## Editing

- **Texts**: edit [js/i18n.js](js/i18n.js). Each text has a Kazakh (`kk`) and an English (`en`) version.
- **Colours**: change the variables at the top of [css/style.css](css/style.css).
- **Preview locally**: run `python -m http.server 8000` in this folder and open <http://localhost:8000>.
