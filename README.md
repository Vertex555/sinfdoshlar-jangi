# 🔥 SINFDOSHLAR JANGI — 24/7 Battle Royale

Fully free, works even when your laptop is off. One Node.js service = web server + game + Telegram bot all together.

## NIMA BU?

- Multiplayer 3D battle royale (Three.js)
- Downloads in Telegram — everyone plays together
- Results are posted automatically to your Telegram group
- Hosted on Render.com free plan → works 24/7, no need to keep laptop on

## ISHGA TUSHIRISH (bir marta, ~10 daqiqa)

### 1. GitHub repo yaratish
1. https://github.com/new dan bepul repo yarating (nomi: `sinfdoshlar-jangi`, Public)
2. Repo sahifasida **"uploading an existing file"** linkini bosing
3. Quyidagi papkalar/fayllarni o'zi qo'ying:

```
render.yaml
package.json
package-lock.json
server.js
.gitignore
public/
   └── index.html
```

⚠️ **MUHIM:** Repo ildizida `server.js` to'g'ridan-to'g'ri bo'lishi kerak (papka ichida emas). `render_deploy/` deb nomlangan papka YOKIN tolmasin — faqat uning ICHIDAGI fayllar repo ildizida bo'lsin.

### 2. Render.com da deploy
1. https://render.com → sign up with GitHub
2. **New** → **New Web Service**
3. GitHub repongizni tanlang (`sinfdoshlar-jangi`)
4. Sozlamalar AVTOMATIK bo'ladi (`render.yaml` dan):
   - Root Directory: `.`
   - Build: `npm install`
   - Start: `npm start`
5. **Create Web Service** tugmasi
6. ~3 daqiqa kuting. Natijada `https://sinfdoshlar-jangi.onrender.com` manzil olasiz

### 3. Botni guruhga qo'shish
1. Telegram'da guruhni oching
2. Botni qo'shing: `@Just_Game777_bot`
3. Botni **Admin** qiling
4. Guruhda `/start` yozing — bot guruhni "natijalar guruhi" sifatida ro'yxatga oladi

### 4. Tayyor!
- Kimdir `/start` yozsa → "🎮 O'yinga Kirish!" tugmasi
- Pressa → o'yin ochiladi (brauzerda), 3D shahar, joystik, qurollar
- O'yin tugagach (3 daqiqa) → **natijalar avtomatik guruhga yoziladi**
- `/results` → reyting ko'rsatadi

## ⚠️ MUHIM ESLATMA

Laptop o'chirilsa ham ishlaydi — hammasi Render'da. Render bepul tier: 15 daqiqa hech kim kirmasa uxlab qoladi, kimdir o'ynagani boshlasa uyg'onadi. To'liq 24/7 uchrab bepul yetarli.

## TELEGRAM

- `/start` — o'yinga kirish tugmasi
- `/results` — reyting
- `/help` — qo'llanma

## TEXNIK

- **Express** — web server
- **Socket.io** — realtime multiplayer
- **Grammy** — Telegram bot (Node.js)
- **Three.js** — 3D grafika
