## Modules

<dl>
<dt><a href="#module_App">App</a></dt>
<dd><p>Главный компонент приложения.
Управляет аутентификацией и отображением игры Phaser.</p>
</dd>
<dt><a href="#module_AuthForm">AuthForm</a></dt>
<dd><p>React-компонент формы аутентификации.
Предоставляет интерфейс для входа и регистрации пользователей с переключением между режимами.</p>
</dd>
<dt><a href="#module_EventBus">EventBus</a></dt>
<dd><p>Событийная шина для взаимодействия между React-компонентами и сценами Phaser.</p>
</dd>
<dt><a href="#module_PhaserMain">PhaserMain</a></dt>
<dd><p>Главный файл для инициализации игры Phaser.
Определяет конфигурацию и запускает игру с указанной сценой.</p>
</dd>
<dt><a href="#module_PhaserGame">PhaserGame</a></dt>
<dd><p>React-компонент для интеграции игры Phaser в приложение.
Управляет созданием и уничтожением игры, а также передачей активной сцены.</p>
</dd>
<dt><a href="#module_GameScene">GameScene</a></dt>
<dd><p>Сцена игры для Phaser.
Отображает базовый игровой экран и управляет переключением сцен.</p>
</dd>
<dt><a href="#module_HexGridScene">HexGridScene</a></dt>
<dd><p>Сцена с шестиугольной сеткой для Phaser.
Подключается к комнате Colyseus и отображает статус соединения.</p>
</dd>
<dt><a href="#module_Main">Main</a></dt>
<dd><p>Точка входа React-приложения.
Инициализирует рендеринг компонента App.</p>
</dd>
<dt><a href="#module_ClientConfig">ClientConfig</a></dt>
<dd><p>Конфигурационный файл для клиентской части приложения
Централизует доступ к переменным окружения и другим настройкам</p>
</dd>
<dt><a href="#module_ClientLogger">ClientLogger</a></dt>
<dd><p>Модуль логирования для клиентской части.
Использует Winston для записи логов в консоль, файлы и Loki.</p>
</dd>
<dt><a href="#module_SocketClient">SocketClient</a></dt>
<dd><p>Модуль для работы с WebSocket-клиентом Colyseus.
Создаёт клиент с токеном аутентификации.</p>
</dd>
</dl>

<a name="module_App"></a>

## App
Главный компонент приложения.
Управляет аутентификацией и отображением игры Phaser.

<a name="module_App..App"></a>

### App~App() ⇒ <code>JSX.Element</code>
Компонент приложения.

**Kind**: inner method of [<code>App</code>](#module_App)  
**Returns**: <code>JSX.Element</code> - Основной интерфейс приложения  
<a name="module_AuthForm"></a>

## AuthForm
React-компонент формы аутентификации.
Предоставляет интерфейс для входа и регистрации пользователей с переключением между режимами.


* [AuthForm](#module_AuthForm)
    * [~AuthForm()](#module_AuthForm..AuthForm) ⇒ <code>JSX.Element</code>
        * [~handleSubmit(e)](#module_AuthForm..AuthForm..handleSubmit)

<a name="module_AuthForm..AuthForm"></a>

### AuthForm~AuthForm() ⇒ <code>JSX.Element</code>
Компонент формы для входа или регистрации пользователя.

**Kind**: inner method of [<code>AuthForm</code>](#module_AuthForm)  
**Returns**: <code>JSX.Element</code> - Элемент формы аутентификации  
<a name="module_AuthForm..AuthForm..handleSubmit"></a>

#### AuthForm~handleSubmit(e)
Обработчик отправки формы аутентификации.

**Kind**: inner method of [<code>AuthForm</code>](#module_AuthForm..AuthForm)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>Object</code> | Событие формы |

<a name="module_EventBus"></a>

## EventBus
Событийная шина для взаимодействия между React-компонентами и сценами Phaser.

<a name="module_EventBus.EventBus"></a>

### EventBus.EventBus : <code>Phaser.Events.EventEmitter</code>
Экземпляр событийной шины Phaser.

**Kind**: static constant of [<code>EventBus</code>](#module_EventBus)  
<a name="module_PhaserMain"></a>

## PhaserMain
Главный файл для инициализации игры Phaser.
Определяет конфигурацию и запускает игру с указанной сценой.


* [PhaserMain](#module_PhaserMain)
    * [module.exports(parent)](#exp_module_PhaserMain--module.exports) ⇒ <code>Phaser.Game</code> ⏏
        * [~config](#module_PhaserMain--module.exports..config) : <code>Object</code>

<a name="exp_module_PhaserMain--module.exports"></a>

### module.exports(parent) ⇒ <code>Phaser.Game</code> ⏏
Запускает игру Phaser с заданным родительским элементом.

**Kind**: Exported function  
**Returns**: <code>Phaser.Game</code> - Экземпляр игры Phaser  

| Param | Type | Description |
| --- | --- | --- |
| parent | <code>string</code> | ID родительского HTML-элемента |

<a name="module_PhaserMain--module.exports..config"></a>

#### module.exports~config : <code>Object</code>
Конфигурация игры Phaser.

**Kind**: inner constant of [<code>module.exports</code>](#exp_module_PhaserMain--module.exports)  
<a name="module_PhaserGame"></a>

## PhaserGame
React-компонент для интеграции игры Phaser в приложение.
Управляет созданием и уничтожением игры, а также передачей активной сцены.

<a name="module_PhaserGame.PhaserGame"></a>

### PhaserGame.PhaserGame ⇒ <code>JSX.Element</code>
Компонент PhaserGame, обёрнутый в forwardRef для передачи ссылки на игру.

**Kind**: static constant of [<code>PhaserGame</code>](#module_PhaserGame)  
**Returns**: <code>JSX.Element</code> - Элемент контейнера игры  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | Свойства компонента |
| [props.currentActiveScene] | <code>function</code> | Коллбэк для получения текущей сцены |
| ref | <code>Object</code> | Ссылка на объект с игрой и сценой |

<a name="module_GameScene"></a>

## GameScene
Сцена игры для Phaser.
Отображает базовый игровой экран и управляет переключением сцен.


* [GameScene](#module_GameScene)
    * [.Game](#module_GameScene.Game) ⇐ <code>Scene</code>
        * [new exports.Game()](#new_module_GameScene.Game_new)
        * [.create()](#module_GameScene.Game+create)
        * [.changeScene()](#module_GameScene.Game+changeScene)

<a name="module_GameScene.Game"></a>

### GameScene.Game ⇐ <code>Scene</code>
Класс сцены основной игры.

**Kind**: static class of [<code>GameScene</code>](#module_GameScene)  
**Extends**: <code>Scene</code>  

* [.Game](#module_GameScene.Game) ⇐ <code>Scene</code>
    * [new exports.Game()](#new_module_GameScene.Game_new)
    * [.create()](#module_GameScene.Game+create)
    * [.changeScene()](#module_GameScene.Game+changeScene)

<a name="new_module_GameScene.Game_new"></a>

#### new exports.Game()
Создаёт экземпляр сцены игры.

<a name="module_GameScene.Game+create"></a>

#### game.create()
Инициализирует сцену, добавляя фон и текст.

**Kind**: instance method of [<code>Game</code>](#module_GameScene.Game)  
<a name="module_GameScene.Game+changeScene"></a>

#### game.changeScene()
Переключает текущую сцену на 'GameOver'.

**Kind**: instance method of [<code>Game</code>](#module_GameScene.Game)  
<a name="module_HexGridScene"></a>

## HexGridScene
Сцена с шестиугольной сеткой для Phaser.
Подключается к комнате Colyseus и отображает статус соединения.


* [HexGridScene](#module_HexGridScene)
    * [module.exports](#exp_module_HexGridScene--module.exports) ⇐ <code>Phaser.Scene</code> ⏏
        * [new module.exports()](#new_module_HexGridScene--module.exports_new)
        * [.create()](#module_HexGridScene--module.exports+create)
        * [.connectToRoom()](#module_HexGridScene--module.exports+connectToRoom)

<a name="exp_module_HexGridScene--module.exports"></a>

### module.exports ⇐ <code>Phaser.Scene</code> ⏏
Класс сцены с шестиугольной сеткой.

**Kind**: Exported class  
**Extends**: <code>Phaser.Scene</code>  
<a name="new_module_HexGridScene--module.exports_new"></a>

#### new module.exports()
Создаёт экземпляр сцены HexGrid.

<a name="module_HexGridScene--module.exports+create"></a>

#### module.exports.create()
Инициализирует сцену, отображая текст статуса и подключаясь к комнате Colyseus.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_HexGridScene--module.exports)  
<a name="module_HexGridScene--module.exports+connectToRoom"></a>

#### module.exports.connectToRoom()
Подключается к комнате Colyseus с именем "hex".
Обновляет текст статуса в зависимости от результата.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_HexGridScene--module.exports)  
<a name="module_Main"></a>

## Main
Точка входа React-приложения.
Инициализирует рендеринг компонента App.

<a name="module_ClientConfig"></a>

## ClientConfig
Конфигурационный файл для клиентской части приложения
Централизует доступ к переменным окружения и другим настройкам


* [ClientConfig](#module_ClientConfig)
    * [module.exports](#exp_module_ClientConfig--module.exports) : <code>Object</code> ⏏
        * [.APP_ENV](#module_ClientConfig--module.exports.APP_ENV) : <code>string</code>
        * [.WS_URL](#module_ClientConfig--module.exports.WS_URL) : <code>string</code>
        * [.APP_VERSION](#module_ClientConfig--module.exports.APP_VERSION) : <code>string</code>
        * [.CONFIG](#module_ClientConfig--module.exports.CONFIG) : <code>Object</code>

<a name="exp_module_ClientConfig--module.exports"></a>

### module.exports : <code>Object</code> ⏏
Конфигурация для текущей среды.

**Kind**: Exported member  
<a name="module_ClientConfig--module.exports.APP_ENV"></a>

#### module.exports.APP\_ENV : <code>string</code>
Текущая среда приложения (development, staging, production).

**Kind**: static constant of [<code>module.exports</code>](#exp_module_ClientConfig--module.exports)  
<a name="module_ClientConfig--module.exports.WS_URL"></a>

#### module.exports.WS\_URL : <code>string</code>
URL для WebSocket-соединения.

**Kind**: static constant of [<code>module.exports</code>](#exp_module_ClientConfig--module.exports)  
<a name="module_ClientConfig--module.exports.APP_VERSION"></a>

#### module.exports.APP\_VERSION : <code>string</code>
Версия приложения.

**Kind**: static constant of [<code>module.exports</code>](#exp_module_ClientConfig--module.exports)  
<a name="module_ClientConfig--module.exports.CONFIG"></a>

#### module.exports.CONFIG : <code>Object</code>
Конфигурации для разных сред.

**Kind**: static constant of [<code>module.exports</code>](#exp_module_ClientConfig--module.exports)  
<a name="module_ClientLogger"></a>

## ClientLogger
Модуль логирования для клиентской части.
Использует Winston для записи логов в консоль, файлы и Loki.


* [ClientLogger](#module_ClientLogger)
    * [~logger](#module_ClientLogger..logger) : <code>Object</code>
    * [~logLevel](#module_ClientLogger..logLevel) : <code>string</code>
    * [~logFormat](#module_ClientLogger..logFormat) : <code>Object</code>

<a name="module_ClientLogger..logger"></a>

### ClientLogger~logger : <code>Object</code>
Экземпляр логгера Winston.

**Kind**: inner constant of [<code>ClientLogger</code>](#module_ClientLogger)  
<a name="module_ClientLogger..logLevel"></a>

### ClientLogger~logLevel : <code>string</code>
Уровень логирования в зависимости от среды.

**Kind**: inner constant of [<code>ClientLogger</code>](#module_ClientLogger)  
<a name="module_ClientLogger..logFormat"></a>

### ClientLogger~logFormat : <code>Object</code>
Формат логов в зависимости от среды.

**Kind**: inner constant of [<code>ClientLogger</code>](#module_ClientLogger)  
<a name="module_SocketClient"></a>

## SocketClient
Модуль для работы с WebSocket-клиентом Colyseus.
Создаёт клиент с токеном аутентификации.


* [SocketClient](#module_SocketClient)
    * [~token](#module_SocketClient..token) : <code>string</code> \| <code>null</code>
    * [~client](#module_SocketClient..client) : <code>Object</code>

<a name="module_SocketClient..token"></a>

### SocketClient~token : <code>string</code> \| <code>null</code>
Токен аутентификации из локального хранилища.

**Kind**: inner constant of [<code>SocketClient</code>](#module_SocketClient)  
<a name="module_SocketClient..client"></a>

### SocketClient~client : <code>Object</code>
Клиент Colyseus для подключения к игровым комнатам.

**Kind**: inner constant of [<code>SocketClient</code>](#module_SocketClient)  
