# Настройка (уже работает через GitHub)

## Без Supabase — готово после push

1. **Вы:** `teacher.html` → «Открыть панель» → «Папка English» → выбрать `/Users/kamila/English`.
2. **Терминал:** `bash scripts/watch-and-push-live.sh` (автопуш `live/session.json`).
3. **Новая комната** → ссылка Саиду.
4. **Саид:** `index.html?live=КОД&mode=github` (ссылка копируется сама).

Сайт: https://KamillaSnipes.github.io/English/

## Supabase (опционально, realtime)

1. SQL Editor → выполнить `supabase/schema.sql`.
2. Replication → `live_sessions`.
3. Ключи в `js/config.js` или в teacher.html → «Подключить Supabase».
4. Новая комната — без `mode=github` в ссылке.
