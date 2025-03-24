### План разработки для "Zone of Shadows"

#### Общие принципы
- **Параллельная разработка**: Полная реализация точек и путей, минимальный MVP для редактора.
- **Визуализация**: Только текущий гекс с точками и путями(цвет по типу не отображать), остальные гексы — цвет по типу с прозрачностью 90%, точки и пути не отображать.
- **Инструменты**: Phaser.js, Colyseus, Supabase, React DnD, `phaser3-rex-plugins`.
- **Тестирование**: Ручное, Cypress добавляется позже.
- **Документирование**: JSDoc для классов и методов.
- **Правила разработки**: DOCUMENTATION\RULE_DEV.md
---

#### Этап 1: Подготовка инфраструктуры
- **Цель**: Подготовить проект, базу данных и структуру для разработки.
- **Подзадачи**:
  1. **Установка зависимостей**: - выполнено
     - Установить React DnD: `npm install react-dnd react-dnd-html5-backend`.
     - Проверить наличие `phaser3-rex-plugins`, Phaser.js, Colyseus, Supabase в `package.json`.
  2. **Обновление базы данных**: - выполнено
     - Создать миграцию `supabase/migrations/20250323120001_add_energy_to_profiles.sql`:
       ```sql
       ALTER TABLE profiles ADD COLUMN energy INTEGER DEFAULT 100;
       CREATE INDEX idx_profiles_energy ON profiles(energy);
       ```
     - Cоздать миграцию `20250323120002_add_bidirectional_to_point_transitions.sql`:
       ```sql
       ALTER TABLE point_transitions
       ADD COLUMN is_bidirectional BOOLEAN DEFAULT FALSE;
       CREATE INDEX idx_point_transitions_bidirectional ON point_transitions (is_bidirectional);
       ```
  3. **Создание файлов визуализации**: - выполнено
     - `src/game/scenes/Point.js` — рендеринг и логика точек. - выполнено
     - `src/game/scenes/Path.js` — рендеринг и логика путей. - выполнено
  4. **Создание ветки**:
     - `git checkout -b feature/movement-and-map-editor`. - выполнено
- **Файлы**: - выполнено
  - `package.json`.
  - `supabase/migrations/20250323120001_add_energy_to_profiles.sql`.
  - `supabase/migrations/20250316190346_create_point_transitions.sql` (обновление).
  - `src/game/scenes/Point.js`, `src/game/scenes/Path.js`.
- **Результат**: Проект готов, добавлены файлы, база поддерживает энергию и двухсторонние связи.

#### Этап 2: Реализация механики перемещения игрока
##### 2.1. Отображение гексов, точек и путей
- **Цель**: Визуализировать текущий гекс с точками и путями, остальные — только тип.
- **Подзадачи**:
  1. **Обновление HexGrid.js**:
     - Адаптировать:
       - Рендерить все гексы с типом (`neutral`, `free`, `danger`, `controlled`), `alpha: 0.9`.
       - Для текущего гекса (`profiles.current_hex_q`, `current_hex_r`) загружать точки и пути через `MapDataManager`.
  2. **Обновление Point.js**:
     - Рендерить точки текущего гекса:
       - Круг радиусом 10px, цвет по типу (например, `camp` — зелёный, `transition` — синий), `alpha: 0.9`.
       - Клик по точке загружает пути через `MapDataManager`.
  3. **Обновление Path.js**:
     - Рендерить пути текущего гекса:
       - Линия от `from_point_id` до первого узла, круг 10px, линия до следующего узла и т.д., до `to_point_id`.
       - Активный путь: зелёный, толщина 5px, узел 13px, `alpha: 0.9`.
       - Неактивный: серый, толщина 3px, узел 10px.
       - Выбранный: зелёный, толщина 3px, узел 10px.
       - Наведение на следующий/предыдущий узел: радиус +3px.
       - Весь путь остаётся видимым.
     - Клик по узлу для последовательного перемещения.
  4. **Обновление MapDataManager.js**:
     - Добавить методы:
       - `fetchCurrentHexData(hexQ, hexR)`: запрос точек и путей для гекса.
       - `cacheHexData(hexQ, hexR, data)`: кэшировать с TTL 10 минут (`setTimeout` для очистки).
       - `loadHexData(hexQ, hexR)`: сначала кэш, затем база.
  5. **Обновление UIManager.js**:
     - Добавить React-компонент `<TransitionButton />`:
       - Показывать внизу по центру при достижении переходной точки.
       - Текст: "Перейти на соседнюю территорию".
- **Файлы**:
  - `src/game/scenes/HexGrid.js`.
  - `src/game/scenes/Point.js`.
  - `src/game/scenes/Path.js`.
  - `src/game/MapDataManager.js`.
  - `src/components/UIManager.js`.
- **Результат**: Текущий гекс отображает точки и пути, кнопка появляется при переходе.

##### 2.2. Логика перемещения
- **Цель**: Перемещение по узлам и между гексами с сохранением прогресса.
- **Подзадачи**:
  1. **Обновление PlayerController.js**:
     - `moveToNode(node)`: анимация до узла, проверка последовательности.
     - `moveToHex(hexQ, hexR)`: переход в новый гекс после кнопки, очистка кэша старого гекса.
  2. **Обновление CommandSender.js**:
     - `sendMoveCommand(pathId, nodeId)`: перемещение по узлу.
     - `sendHexTransition(pointId)`: переход в другой гекс.
  3. **Обновление pointRoom.js**:
     - Обрабатывать:
       - `move`: обновить `current_point_id`, сохранить в `player_sessions.session_data` (`{ pathId, nodeId }`).
       - `hex_transition`: найти связанную точку через `point_transitions` с `is_bidirectional = true`, обновить `current_hex_q`, `current_hex_r`.
  4. **Обновление MessageHandler.js**:
     - Обрабатывать ответы для `moveToNode` и `moveToHex`.
  5. **Обновление Game.js**:
     - При загрузке:
       - Загружать путь из `player_sessions.session_data`.
       - Использовать `MapDataManager.loadHexData` (кэш или база).
- **Файлы**:
  - `src/components/PlayerController.js`.
  - `src/game/CommandSender.js`.
  - `server/pointRoom.js`.
  - `src/game/MessageHandler.js`.
  - `src/game/scenes/Game.js`.
- **Результат**: Игрок движется по узлам и переходит между гексами.

##### 2.3. События на узлах
- **Цель**: Модальные окна через `phaser3-rex-plugins` с кнопкой "Закрыть".
- **Подзадачи**:
  1. **Обновление Path.js**:
     - Передавать `node.event` в `Game.js`.
  2. **Обновление Game.js**:
     - `showEventModal(event)`: использовать `rexUI.add.confirmDialog` с текстом и кнопкой "Закрыть".
  3. **Обновление UIManager.js**:
     - `showRexModal(text)`: управление модалкой.
- **Файлы**:
  - `src/game/scenes/Path.js`.
  - `src/game/scenes/Game.js`.
  - `src/components/UIManager.js`.
- **Результат**: Модальные окна с кнопкой "Закрыть".

##### 2.4. Управление энергией
- **Цель**: Ограничение энергией с прогресс-баром.
- **Подзадачи**:
  1. **Обновление GameStateManager.js**:
     - `getEnergy()`, `updateEnergy(amount)`, `startEnergyRegen()` (1 единица/3 секунды, независимо от модалок).
     - Проверять энергию (минимум 5).
  2. **Обновление pointRoom.js**:
     - Уменьшать энергию на 5 при движении.
  3. **Обновление UIManager.js**:
     - `renderEnergyBar()`: темно-голубой статичный прогресс-бар внизу экрана.
- **Файлы**:
  - `src/game/GameStateManager.js`.
  - `server/pointRoom.js`.
  - `src/components/UIManager.js`.
- **Результат**: Энергия восстанавливается, прогресс-бар виден.

#### Этап 3: Реализация редактора карты (MVP)
##### 3.1. Создание интерфейса редактора
- **Цель**: Минимальный редактор с полным редактированием.
- **Подзадачи**:
  1. **Создание MapEditor.jsx**:
     - Включить `HexGrid.js` с `editable={true}`.
     - Панель свойств: поля для `id`, `type`, `x`, `y`, `hex_q`, `hex_r` (точки), `from_point_id`, `to_point_id`, `nodes`, `is_bidirectional` (пути).
     - Кнопка "Сохранить".
     - Загружать данные из `localStorage` (`mapEditorDraft`) при монтировании.
  2. **Обновление App.jsx**:
     - Показывать `MapEditor.jsx` для `role = 'admin'`.
  3. **Обновление useAuth.js**:
     - `getUserRole()`: запрос роли из `profiles`.
- **Файлы**:
  - `src/components/MapEditor.jsx`.
  - `src/App.jsx`.
  - `src/hooks/useAuth.js`.
- **Результат**: Админ видит редактор с панелью и кнопкой.

##### 3.2. Drag-and-Drop для точек и путей
- **Цель**: Редактирование через DnD с сохранением в `localStorage`.
- **Подзадачи**:
  1. **Обновление MapEditor.jsx**:
     - DnD:
       - Точки: перемещение с ПКМ, обновление `x`, `y`.
       - Пути: выбор `from_point_id`, `to_point_id`, узлы через DnD.
     - Сохранять в `localStorage` (`mapEditorDraft`):
       - Формат: `{ points: [{ id, type, x, y, hex_q, hex_r }], paths: [{ id, from_point_id, to_point_id, nodes, is_bidirectional }] }`.
     - При "Сохранить": отправлять POST/PUT в Supabase, очищать `localStorage`.
  2. **Обновление admin.js**:
     - Эндпоинты CRUD для `points_of_interest` и `point_transitions` с проверкой `role`.
- **Файлы**:
  - `src/components/MapEditor.jsx`.
  - `server/admin.js`.
- **Результат**: Админ редактирует карту, сохраняет по кнопке.

##### 3.3. Синхронизация с Supabase
- **Цель**: Обновление карты при загрузке.
- **Подзадачи**:
  1. **Обновление supabase.js**:
     - Подписки на `points_of_interest`, `point_transitions`.
  2. **Обновление HexGrid.js**:
     - Обновлять данные при загрузке гекса.
- **Файлы**:
  - `src/lib/supabase.js`.
  - `src/game/scenes/HexGrid.js`.
- **Результат**: Карта синхронизируется при входе.

#### Этап 4: Тестирование
- **Цель**: Ручное тестирование.
- **Подзадачи**:
  1. **Ручные тесты**:
     - Перемещение по узлам с событиями.
     - Переход между гексами.
     - Редактирование в MVP.
  2. **Отложить Cypress**:
     - Добавить позже после ручных тестов.
- **Результат**: Механика и редактор протестированы вручную.

---

### Итог
- **Механика**: Полная реализация точек, путей, переходов между гексами, энергии и событий.
- **Редактор**: MVP с DnD, редактированием всех полей, сохранением через кнопку и `localStorage`.
- **Тестирование**: Ручное, Cypress отложен.