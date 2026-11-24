# Gupshup: realtime chat app

Stack: React (Vite) + Tailwind, Node/Express, Socket.IO, MongoDB.

## Run karna

Pehle MongoDB chal raha ho (local ya Atlas). Phir do terminals:

```bash
# Terminal 1
cd backend
npm install
npm run dev        # http://localhost:5000

# Terminal 2
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`backend/.env` mein `MONGO_URI` aur `JWT_SECRET` apne hisaab se change karo.

## Test kaise karein

1. Ek browser mein account banao, doosre browser (ya incognito) mein dusra account.
2. Dono se chat karo: live messages, typing, online status aur seen ticks check karo.

## Cloudinary (photo bhejne ke liye)

1. cloudinary.com par free account banao.
2. Dashboard se Cloud name, API Key, API Secret copy karo.
3. `backend/.env` mein ye 3 values bharo:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. `cd backend && npm install` (naye packages: cloudinary, multer), phir server restart.

## Groups aur voice messages

- **Groups:** Sidebar mein People / Groups tabs hain. Groups tab mein "New group" se group banao.
  Group header par click karke members add/remove, naam badalna (sirf admin) ya group chhodna.
- **Voice message:** message box ke right side par mic button. Dabao to recording shuru hoti hai,
  send button par dabao to Cloudinary par upload hokar chali jati hai (max 5 minute).
  Mic permission browser mein allow karni hoti hai (localhost par chalta hai).
- Naye packages nahi jude, bas dono servers restart karo.

## Color themes

Sidebar ke upar (aur login page par) palette icon se 4 themes chun sakte ho: Lagoon, Ocean, Plum, Graphite.
Light/dark mode alag se chalta hai. Naya theme jodna ho to `frontend/src/index.css` mein ek
`html[data-palette="naam"]` block aur `frontend/src/lib/palettes.js` mein ek entry jodo.
