# StaySharp_PWA

PWA-калькулятор углов заточки и хонингования для Tormek с журналом заточек и облачной синхронизацией через Google Sheets + Apps Script.

[Live](https://ukdc.github.io/staysharp-pwa/)

## Что в проекте сейчас
- Калькулятор USH/FVB_H (Grinding/Honing).
- Журнал заточек с локальным хранением и двусторонней синхронизацией.
- Справочник ножей (Database) с синхронизацией из Google Sheets.
- PWA (Service Worker, offline, обновление ассетов).
- Защита от дублей/потерь при синхронизации и конфликтов редактирования.

## Текущая рабочая модель синхронизации
- Клиент хранит журнал в `localStorage` (`staysharp_history`).
- Любые `add/update/delete` пишутся в локальную outbox-очередь (`staysharp_cloud_outbox`).
- Очередь отправляется сразу после изменений и ретраится в фоне.
- Pull из облака делает merge, а не слепой overwrite.
- Конфликты решаются по `UpdatedAt` (`last edit wins`).
- Удаления между устройствами распространяются через:
  - удаление строки в облаке (`hard delete`),
  - дельту облачного снапшота ID,
  - локальный реестр удалённых ID с TTL (`staysharp_deleted_ids`).
- Защита от аварийной потери: если облако внезапно вернуло пустой список, массовое удаление локальных данных блокируется.

## Требования к Google Sheet (критично)
Лист `History` должен иметь шапку в первой строке. Рекомендуемый порядок:

1. `ID`
2. `Date`
3. `Brand`
4. `Series`
5. `Steel`
6. `C, %`
7. `CrMoV, %`
8. `Length`
9. `Width`
10. `Sharp. angle (double)`
11. `Honing add`
12. `BESS g`
13. `Comments`
14. `UpdatedAt`

Важно:
- `ID` обязателен для корректного `update/delete`.
- `UpdatedAt` обязателен для `last edit wins`.
- Колонку `ID` можно скрыть в таблице.
- Если шапка отсутствует, записи из приложения не будут корректно маппиться.

## Backend (Apps Script)
Исходник backend хранится в репозитории:

- [Code.gs](backend/google-apps-script/Code.gs)
- [backend/google-apps-script/README.md](backend/google-apps-script/README.md)

Обязательно:
- В `Script Properties` задать `API_TOKEN`.
- После изменений делать новый `Web App Deploy` (New version).

## Локальная разработка
```bash
cd StaySharp_PWA
python3 -m http.server 4173
```

## Публикация (GitHub Pages)
```bash
cd StaySharp_PWA
git add js/app.js index.html sw.js backend/google-apps-script
git commit -m "Update sync logic/docs"
git push
```

После деплоя для принудительного обновления клиента:
- открыть `https://ukdc.github.io/staysharp-pwa/?fresh=<number>`
- сделать `Cmd+Shift+R`.

## Траблшутинг
- Кнопка "Сохранить" не реагирует:
  - открыть Console и проверить ошибки JS,
  - проверить `typeof window.saveRecordClick` (должно быть `function`).
- Запись не уходит в Google Sheet:
  - проверить, что у `History` есть корректная шапка,
  - проверить актуальный deploy Apps Script,
  - проверить токен в `Script Properties`.
- Разный формат даты в журнале:
  - в клиенте включена нормализация, ISO и текстовые значения приводятся к читаемому виду.

## Структура
```text
index.html
css/style.css
js/app.js
js/knives.js
sw.js
manifest.json
backend/google-apps-script/Code.gs
```

## Лицензия
Личный проект.
