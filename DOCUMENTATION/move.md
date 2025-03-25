# Пошаговый план разработки механики перемещения и редактора карты

## Общие принципы
- **Параллельная разработка**: Полная реализация точек и путей, минимальный MVP для редактора.
- **Визуализация**: Только текущий гекс с точками и путями (цвет по типу не отображать), остальные гексы — цвет по типу с прозрачностью 90%, точки и пути не отображать.
- **Инструменты**: Phaser.js, Colyseus, Supabase, `phaser3-rex-plugins` (React DnD удалён).
- **Тестирование**: Ручное, Cypress добавляется позже.
- **Документирование**: JSDoc для классов и методов.
- **Правила разработки**: Соблюдать правила из `DOCUMENTATION\RULE_DEV.md`.

---

## Этап 1: Подготовка инфраструктуры
- **Статус**: Выполнено.
- **Подзадачи**:
  1. Установлены зависимости (`phaser3-rex-plugins`, Phaser.js, Colyseus, Supabase).
  2. Обновлена база данных (`energy`, `is_bidirectional`).
  3. Созданы `Point.js`, `Path.js`.
  4. Ветка `feature/movement-and-map-editor` создана.
- **Изменения**: React DnD удалён, редактор переведён на Phaser (`EditorScene.js`).

---

## Этап 2: Реализация механики перемещения игрока

### 2.1. Отображение гексов, точек и путей
- **Статус**: В процессе.
- **Подзадачи**:
  1. **Обновление HexGrid.js**:
     - Рендерить гексы с типом (`alpha: 0.9`).
     - Для текущего гекса загружать точки и пути из Supabase через `MapDataManager`.
  2. **Обновление Point.js**:
     - Рендерить точки текущего гекса (круг 10px, цвет по типу, `alpha: 0.9`).
     - Клик загружает пути.
  3. **Обновление Path.js** (заменено на HexGrid.js)**:
     - Рендерить пути текущего гекса (прямые линии, узлы как круги 10px).
     - Активный путь: зелёный, толщина 5px, узел 13px.
     - Неактивный: серый, толщина 3px, узел 10px.
     - Клик по узлу для движения.
  4. **Обновление MapDataManager.js**:
     - `fetchCurrentHexData(hexQ, hexR)`: запрос точек и путей.
     - `cacheHexData(hexQ, hexR, data)`: кэш с TTL 10 минут.
     - `loadHexData(hexQ, hexR)`: кэш или база.
  5. **Обновление UIManager.js**:
     - Кнопка "Перейти на соседнюю территорию" при достижении переходной точки.
- **Файлы**:
  - `src/game/scenes/HexGrid.js`, `Point.js`, `MapDataManager.js`, `UIManager.js`.

### 2.2. Логика перемещения
- **Статус**: В процессе.
- **Подзадачи**:
  1. **Обновление PlayerController.js**:
     - `moveToNode(pathId, nodeIndex)`: анимация до узла.
     - `moveToHex(hexQ, hexR)`: переход в новый гекс.
  2. **Обновление CommandSender.js**:
     - `sendMoveCommand(pathId, nodeId)`: перемещение по узлу.
     - `sendHexTransition(pointId)`: переход в гекс.
  3. **Обновление pointRoom.js**:
     - `move`: обновить `current_point_id`, сохранить в `player_sessions`.
     - `hex_transition`: обновить `current_hex_q`, `current_hex_r`.
  4. **Обновление MessageHandler.js**:
     - Обрабатывать `moveToNode`, `moveToHex`.
  5. **Обновление Game.js**:
     - Загружать путь из `player_sessions.session_data`.
- **Файлы**:
  - `src/components/PlayerController.js`, `CommandSender.js`, `server/pointRoom.js`, `MessageHandler.js`, `Game.js`.

### 2.3. События на узлах
- **Статус**: Не начато.
- **Подзадачи**:
  1. **Обновление Path.js** (или HexGrid.js)**:
     - Передавать `node.event` в `Game.js`.
  2. **Обновление Game.js**:
     - `showEventModal(event)`: `rexUI.add.confirmDialog` с кнопкой "Закрыть".
  3. **Обновление UIManager.js**:
     - `showRexModal(text)`: управление модалкой.
- **Файлы**:
  - `src/game/scenes/HexGrid.js`, `Game.js`, `UIManager.js`.

### 2.4. Управление энергией
- **Статус**: Не начато.
- **Подзадачи**:
  1. **Обновление GameStateManager.js**:
     - `getEnergy()`, `updateEnergy(amount)`, `startEnergyRegen()` (1 ед./3 сек).
  2. **Обновление pointRoom.js**:
     - Уменьшать энергию на 5 при движении.
  3. **Обновление UIManager.js**:
     - `renderEnergyBar()`: прогресс-бар внизу.
- **Файлы**:
  - `src/game/GameStateManager.js`, `server/pointRoom.js`, `UIManager.js`.

---

## Этап 3: Реализация редактора карты (MVP)

### 3.1. Создание интерфейса редактора
- **Статус**: В процессе.
- **Подзадачи**:
  1. **Обновление EditorScene.js**:
     - Использовать пример Phaser для создания/редактирования путей.
     - Панель свойств через `rexUI` (поля: `id`, `type`, `x`, `y`, `hex_q`, `hex_r`, `from_point_id`, `to_point_id`, `nodes`, `is_bidirectional`).
     - Кнопка "Сохранить" для отправки в Supabase.
  2. **Обновление App.jsx**:
     - Переключение на `EditorScene` для админов.
  3. **Обновление useAuth.js**:
     - `getUserRole()`: запрос роли.
- **Файлы**:
  - `src/game/scenes/EditorScene.js`, `App.jsx`, `useAuth.js`.

### 3.2. Drag-and-Drop для точек и путей
- **Статус**: В процессе.
- **Подзадачи**:
  1. **Обновление EditorScene.js**:
     - Drag-and-drop для узлов (прямые линии вместо сплайнов).
     - Выбор `from_point_id`, `to_point_id` через клик по POI.
     - Сохранение в Supabase при нажатии "Сохранить".
- **Файлы**:
  - `src/game/scenes/EditorScene.js`.

### 3.3. Синхронизация с Supabase
- **Статус**: Не начато.
- **Подзадачи**:
  1. **Обновление supabase.js**:
     - Подписки на `points_of_interest`, `point_transitions`.
  2. **Обновление HexGrid.js**:
     - Обновлять данные при загрузке гекса.
- **Файлы**:
  - `src/lib/supabase.js`, `src/game/scenes/HexGrid.js`.

---

## Этап 4: Тестирование
- **Статус**: Не начато.
- **Подзадачи**:
  1. Ручные тесты:
     - Перемещение по узлам.
     - Переход между гексами.
     - Редактирование в `EditorScene`.
  2. Отложить Cypress.

---

## Итог
- **Механика**: Полная реализация точек, путей, переходов, энергии, событий.
- **Редактор**: MVP на Phaser в `EditorScene.js` с сохранением в Supabase.
- **Тестирование**: Ручное, Cypress отложен.