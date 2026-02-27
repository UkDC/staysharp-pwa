# Google Apps Script Backend

Источник backend-логики синхронизации хранится в `Code.gs`.

## Что реализовано
- `doGet` для чтения `History` и `Database`.
- `doPost` для записи в `History` (`add/update/delete`).
- Проверка токена из `Script Properties` (`API_TOKEN`).
- `last edit wins` по полю `UpdatedAt`.
- Идемпотентное удаление (`Success: Already deleted`).
- `onEdit` для автозаполнения `ID`, `Date`, `UpdatedAt` при ручном вводе.
- Поддержка алиасов заголовков (RU/EN), но основной рабочий вариант должен оставаться каноническим.

## Обязательная шапка листа History
Рекомендуемые колонки:

`ID | Date | Brand | Series | Steel | C, % | CrMoV, % | Length | Width | Sharp. angle (double) | Honing add | BESS g | Comments | UpdatedAt`

Критично:
- без `ID` не будет корректного `update/delete`;
- без `UpdatedAt` не будет корректного разрешения конфликтов;
- если первая строка (шапка) отсутствует, PWA не сможет корректно маппить поля.

Лист `Database` также должен существовать: он используется для загрузки справочника кнопкой `dbSync` в разделе Справочник.

## Установка
1. Откройте Apps Script проекта Google Sheet.
2. Полностью замените содержимое скрипта кодом из `Code.gs`.
3. В `Project Settings -> Script Properties` добавьте:
   - key: `API_TOKEN`
   - value: значение, совпадающее с токеном клиента
4. Сохраните проект.

## Триггер onEdit
Если в `History` планируется ручной ввод строк напрямую из Google Sheet:
1. Откройте `Triggers`.
2. Добавьте триггер для функции `onEdit`.
3. Event type: `On edit`.

Это нужно для автозаполнения технических полей `ID`, `Date`, `UpdatedAt`.

## Деплой
1. `Deploy -> Manage deployments`.
2. Редактируйте активный `Web app`.
3. Выберите `New version`.
4. `Execute as`: `Me`.
5. `Who has access`: `Anyone` (или `Anyone with the link`).
6. `Deploy`.

## Проверка
1. Откройте `History` и убедитесь, что шапка существует.
2. Создайте запись в PWA.
3. Запустите `dbSync` в разделе Журнал или дождитесь фоновой отправки.
4. Убедитесь, что строка появилась в `History`.
5. Для проверки чтения откройте URL вида:
   - `.../exec?token=<ваш_API_TOKEN>&sheet=History`
   - `.../exec?token=<ваш_API_TOKEN>&sheet=Database`
