-- Создание таблиц для анонимного чата

-- Таблица серверов (сообществ)
CREATE TABLE servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) DEFAULT '💬',
    description TEXT,
    member_count INTEGER DEFAULT 0,
    online_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица каналов
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    topic VARCHAR(200),
    message_count INTEGER DEFAULT 0,
    channel_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id)
);

-- Таблица анонимных пользователей (сессии)
CREATE TABLE anonymous_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    avatar_letter CHAR(1) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сообщений
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (user_id) REFERENCES anonymous_users(id)
);

-- Индексы для производительности
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_channels_server ON channels(server_id);
CREATE INDEX idx_users_session ON anonymous_users(session_token);
CREATE INDEX idx_users_active ON anonymous_users(last_active);

-- Вставка тестовых данных
INSERT INTO servers (name, emoji, description, member_count, online_count) VALUES 
('Общий чат', '💬', 'Место для общих разговоров', 1547, 234),
('Игроки', '🎮', 'Обсуждение игр и киберспорта', 892, 156),
('Творчество', '🎨', 'Делимся творческими работами', 445, 67),
('Музыка', '🎵', 'Обсуждаем музыку и делимся треками', 723, 89);

INSERT INTO channels (server_id, name, topic, message_count) VALUES 
(1, 'general', 'Общие разговоры', 1247),
(1, 'random', 'Случайные темы', 856),
(1, 'help', 'Помощь новичкам', 234),
(2, 'gaming', 'Игровые обсуждения', 567),
(2, 'tournaments', 'Турниры и соревнования', 123),
(3, 'showcase', 'Показываем работы', 334),
(3, 'feedback', 'Критика и советы', 211),
(4, 'music-chat', 'Обсуждение музыки', 445),
(4, 'recommendations', 'Рекомендации треков', 289);

INSERT INTO anonymous_users (username, avatar_letter, session_token) VALUES 
('Аноним#1234', 'A', 'sess_12345'),
('Гость#5678', 'Г', 'sess_67890'),
('Путник#9012', 'П', 'sess_90123'),
('Странник#3456', 'С', 'sess_34567');

INSERT INTO messages (channel_id, user_id, content) VALUES 
(1, 1, 'Привет всем! 👋'),
(1, 2, 'Как дела?'),
(1, 3, 'Отлично! А у вас?'),
(1, 4, 'Кто хочет поговорить о космосе? 🚀'),
(2, 1, 'Интересная мысль!'),
(2, 2, 'Согласен с тобой'),
(3, 3, 'Нужна помощь с настройкой'),
(4, 4, 'Кто играет в новую игру?');