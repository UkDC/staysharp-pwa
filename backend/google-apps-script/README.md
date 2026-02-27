# Google Apps Script Backend

Источник backend-логики синхронизации хранится в `Code.gs`.

## Что реализовано
- `doGet` для чтения `History` и `Database`.
- `doPost` для записи в `History` (`add/update/delete`).
- Проверка токена из `Script Properties` (`API_TOKEN`).
- `last edit wins` по полю `UpdatedAt`.
- Идемпотентное удаление (`Success: Already deleted`).
- `onEdit` для автозаполнения `ID`, `Date`, `UpdatedAt` при ручном вводе.

## Обязательная шапка листа History
Рекомендуемые колонки:

`ID | Date | Brand | Series | Steel | C, % | CrMoV, % | Length | Width | Sharp. angle (double) | Honing add | BESS g | Comments | UpdatedAt`

## Установка
1. Откройте Apps Script проекта Google Sheet.
2. Полностью замените содержимое скрипта кодом из `Code.gs`.
3. В `Project Settings -> Script Properties` добавьте:
   - key: `API_TOKEN`
   - value: `StaySharp_Secure_Token_2026`

## Деплой
1. `Deploy -> Manage deployments`.
2. Редактируйте активный `Web app`.
3. Выберите `New version`.
4. `Execute as`: `Me`.
5. `Who has access`: `Anyone` (или `Anyone with the link`).
6. `Deploy`.

## Проверка
1. GET:
   - `.../exec?token=StaySharp_Secure_Token_2026&sheet=History`
2. Создайте запись в PWA.
3. Убедитесь, что строка появилась в `History`.
