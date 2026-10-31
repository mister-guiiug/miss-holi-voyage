# Supabase — miss-holi-voyage

## Auth : URL de retour du lien magique

Sans ces URLs dans le **projet hébergé**, GoTrue ignore `emailRedirectTo` et
substitue le **Site URL** (souvent encore `http://localhost:3000` à la
création). Le navigateur ouvre alors le mauvais port, le vérificateur PKCE
manque, et l’utilisateur voit `otp_expired` / `access_denied`.

Dans le tableau de bord du projet (`damixtzatbdqsjragbpz`) :

**Authentication → URL Configuration**

| Champ | Valeur |
| ----- | ------ |
| Site URL | `https://mister-guiiug.github.io/miss-holi-voyage/` (prod) ou `http://127.0.0.1:5219/` en pure local |
| Redirect URLs | `http://127.0.0.1:5219/**` |
| | `http://localhost:5219/**` |
| | `https://mister-guiiug.github.io/miss-holi-voyage/**` |

Le client envoie `emailRedirectTo` = origine courante + base Vite + `compte`
(`adresseDeRetour()`). Ouvrir le lien **dans le même navigateur** que celui
qui a demandé le courriel (stockage du code PKCE).

La pile locale (`supabase start`) lit les mêmes idées dans `config.toml`.
