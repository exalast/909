# Servidor 909 — sitio + panel de admin

Sitio del servidor de Discord "909" con efecto de nieve y un panel de
administración en `/admin` para cambiar el fondo, el título, el subtítulo,
el link de invitación y activar/desactivar la nieve. Los cambios se guardan
en una base de datos Postgres y se ven al instante para **todos** los
visitantes del sitio.

## Desplegar en Render.com (recomendado: Blueprint)

1. Sube esta carpeta completa a un repositorio de GitHub.
2. En Render → **New +** → **Blueprint**.
3. Conecta el repo. Render leerá `render.yaml` y creará automáticamente:
   - El servicio web (`servidor-909`)
   - La base de datos Postgres (`db-909`), conectada por `DATABASE_URL`
4. Antes de confirmar el despliegue, Render te pedirá el valor de
   `ADMIN_PASSWORD` (está marcado como `sync: false` para que no quede
   escrito en el repo). Pon la contraseña que quieras usar para entrar a
   `/admin`.
5. Dale "Apply". En unos minutos tendrás tu sitio en algo como
   `https://servidor-909.onrender.com` y el panel en
   `https://servidor-909.onrender.com/admin`.

### Si prefieres crearlo manualmente (sin Blueprint)
1. Crea una base de datos Postgres en Render (New + → PostgreSQL, plan free).
2. Crea un Web Service apuntando a tu repo, runtime Node, build command
   `npm install`, start command `node server.js`.
3. En "Environment", agrega:
   - `DATABASE_URL` → la "Internal Connection String" de tu base de datos
   - `JWT_SECRET` → cualquier cadena larga y aleatoria
   - `ADMIN_PASSWORD` → la contraseña para el panel de admin

## Desarrollo local

```bash
cp .env.example .env
# edita .env con tus datos (necesitas un Postgres local o remoto)
npm install
npm start
```

Abre `http://localhost:3000` para el sitio y `http://localhost:3000/admin`
para el panel.

## Cómo funciona el panel de admin

- Entra a `/admin` y escribe la contraseña (`ADMIN_PASSWORD`).
- Puedes subir una imagen de fondo (se guarda como base64 en la base de
  datos, sin necesidad de almacenamiento de archivos aparte).
- Puedes cambiar el título, el subtítulo, el link de invitación de Discord
  y activar/desactivar el efecto de nieve.
- Al guardar, el sitio público (`/`) refleja los cambios de inmediato para
  cualquiera que lo visite.

## Configurar tu dominio propio

En el dashboard del servicio en Render: **Settings → Custom Domains → Add
Custom Domain**. Sigue las instrucciones para crear el registro DNS (A o
CNAME, según si es dominio raíz o subdominio) en tu proveedor de dominio.
Render emite el certificado SSL automáticamente una vez verificado.
