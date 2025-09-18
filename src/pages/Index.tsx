import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';

const Index: React.FC = () => {
  const [activeTab, setActiveTab] = useState('главная');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [stats, setStats] = useState({ online_users: 1547, messages_today: 12453 });
  const [sessionToken, setSessionToken] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigation = [
    { id: 'главная', label: 'Главная', icon: 'Home' },
    { id: 'чаты', label: 'Чаты', icon: 'MessageCircle' },
    { id: 'серверы', label: 'Серверы', icon: 'Server' },
    { id: 'каналы', label: 'Каналы', icon: 'Hash' },
    { id: 'правила', label: 'Правила', icon: 'Shield' }
  ];

  // API URLs
  const API_URLS = {
    messages: 'https://functions.poehali.dev/6edee770-b3ed-48dd-8c64-4c5689790e03',
    servers: 'https://functions.poehali.dev/a0f645d9-0fc2-4cc2-b5e4-5218604ddc67',
    online: 'https://functions.poehali.dev/94d7f14e-ff02-47f2-aa70-a08bbed212a2'
  };

  // Загрузка данных с сервера
  const loadMessages = async (channelId = selectedChannelId) => {
    try {
      const response = await fetch(`${API_URLS.messages}?channel_id=${channelId}&limit=50`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      // Fallback данные
      setMessages([
        { id: 1, user: 'Аноним#1234', message: 'Привет всем! 👋', time: '14:23', avatar: 'A' },
        { id: 2, user: 'Гость#5678', message: 'Как дела?', time: '14:25', avatar: 'Г' },
        { id: 3, user: 'Путник#9012', message: 'Отлично! А у вас?', time: '14:27', avatar: 'П' },
        { id: 4, user: 'Странник#3456', message: 'Кто хочет поговорить о космосе? 🚀', time: '14:30', avatar: 'С' }
      ]);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch(`${API_URLS.servers}?type=servers`);
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Ошибка загрузки серверов:', error);
      // Fallback данные
      setServers([
        { id: 1, name: 'Общий чат', members: 1547, online: 234, emoji: '💬' },
        { id: 2, name: 'Игроки', members: 892, online: 156, emoji: '🎮' },
        { id: 3, name: 'Творчество', members: 445, online: 67, emoji: '🎨' },
        { id: 4, name: 'Музыка', members: 723, online: 89, emoji: '🎵' }
      ]);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await fetch(`${API_URLS.servers}?type=channels`);
      const data = await response.json();
      if (data.channels) {
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Ошибка загрузки каналов:', error);
      // Fallback данные
      setChannels([
        { id: 1, name: 'general', topic: 'Общие разговоры', messages: 1247 },
        { id: 2, name: 'random', topic: 'Случайные темы', messages: 856 },
        { id: 3, name: 'help', topic: 'Помощь новичкам', messages: 234 },
        { id: 4, name: 'voice', topic: 'Голосовой канал', messages: 45 }
      ]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(API_URLS.online);
      const data = await response.json();
      if (data.online_users) {
        setStats({
          online_users: data.online_users,
          messages_today: data.messages_today || 12453
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      // Используем стандартные значения
      setStats({ online_users: 1547, messages_today: 12453 });
    }
  };

  // Инициализация при загрузке
  useEffect(() => {
    loadMessages();
    loadServers();
    loadChannels();
    loadStats();
    
    // Обновляем статистику каждые 30 секунд
    const statsInterval = setInterval(loadStats, 30000);
    
    // Обновляем сообщения каждые 5 секунд
    const messagesInterval = setInterval(() => {
      if (activeTab === 'чаты') {
        loadMessages();
      }
    }, 5000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(messagesInterval);
    };
  }, [activeTab, selectedChannelId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          message: newMessage,
          channel_id: selectedChannelId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Сохраняем токен сессии для будущих запросов
        if (data.session_token) {
          setSessionToken(data.session_token);
        }
        
        // Добавляем сообщение в локальный список
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Перезагружаем сообщения через секунду для синхронизации
        setTimeout(() => loadMessages(), 1000);
      } else {
        console.error('Ошибка отправки сообщения:', data);
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // В случае ошибки добавляем сообщение локально
      const newMsg = {
        id: Date.now(),
        user: sessionToken ? `Аноним#${sessionToken.slice(-4)}` : 'Аноним#1234',
        avatar: 'А',
        message: newMessage,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'главная':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-primary rounded-2xl p-8 text-white">
              <h1 className="text-4xl font-bold mb-4">Anonymous Chat</h1>
              <p className="text-lg opacity-90">
                Добро пожаловать в безопасное пространство для общения
              </p>
              <div className="mt-6 flex items-center gap-4">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  <Icon name="Users" size={16} className="mr-2" />
                  {stats.online_users.toLocaleString()} пользователей онлайн
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  <Icon name="MessageCircle" size={16} className="mr-2" />
                  {stats.messages_today.toLocaleString()} сообщения сегодня
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 animate-scale-in">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Icon name="Shield" size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">Анонимность</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Полная приватность без регистрации
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 animate-scale-in" style={{animationDelay: '0.1s'}}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Icon name="Zap" size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">Мгновенно</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Быстрый доступ без ожидания
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 animate-scale-in" style={{animationDelay: '0.2s'}}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Icon name="Globe" size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">Глобально</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Общение без границ
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'чаты':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Активные чаты</h2>
              <Button className="bg-gradient-primary hover:bg-gradient-secondary" onClick={loadMessages}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Обновить
              </Button>
            </div>

            <Card className="h-96 flex flex-col">
              <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 animate-slide-in">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-gradient-primary text-white">
                        {msg.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{msg.user}</span>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              
              <Separator />
              
              <div className="p-4 flex gap-2">
                <Input
                  placeholder="Напишите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={loading || !newMessage.trim()}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <Icon name="Loader2" size={16} className="animate-spin" />
                  ) : (
                    <Icon name="Send" size={16} />
                  )}
                </Button>
              </div>
            </Card>
          </div>
        );

      case 'серверы':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Серверы сообщества</h2>
              <Button variant="outline" onClick={loadServers}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Обновить
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servers.map((server, index) => (
                <Card key={server.id} className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer animate-scale-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl">
                          {server.emoji}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{server.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Icon name="Users" size={14} />
                              {server.members}
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
                              {server.online} онлайн
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-gradient-primary hover:bg-gradient-secondary">
                        Войти
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'каналы':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Тематические каналы</h2>
              <Button variant="outline" onClick={loadChannels}>
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Обновить
              </Button>
            </div>

            <div className="space-y-3">
              {channels.map((channel, index) => (
                <Card 
                  key={channel.id} 
                  className="hover:shadow-md transition-all duration-300 cursor-pointer animate-slide-in" 
                  style={{animationDelay: `${index * 0.1}s`}}
                  onClick={() => {
                    setSelectedChannelId(channel.id);
                    setActiveTab('чаты');
                    loadMessages(channel.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                          <Icon name="Hash" size={16} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">#{channel.name}</h3>
                          <p className="text-sm text-muted-foreground">{channel.topic}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-xs">
                          {channel.messages} сообщений
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Icon name="ChevronRight" size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'правила':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-primary rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Правила сообщества</h2>
              <p className="text-lg opacity-90">
                Для создания безопасной и дружелюбной атмосферы
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: '🤝 Уважение',
                  desc: 'Относитесь к другим участникам с уважением, независимо от их мнений'
                },
                {
                  title: '🚫 Запрещённый контент',
                  desc: 'Не публикуйте спам, оскорбления или неподходящий контент'
                },
                {
                  title: '🔒 Приватность',
                  desc: 'Не делитесь персональной информацией других участников'
                },
                {
                  title: '📢 Модерация',
                  desc: 'Следуйте указаниям модераторов и сообщайте о нарушениях'
                },
                {
                  title: '🎯 По теме',
                  desc: 'Ведите дискуссии в соответствующих каналах и темах'
                }
              ].map((rule, index) => (
                <Card key={index} className="animate-scale-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{rule.title}</h3>
                    <p className="text-muted-foreground">{rule.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return <div>Раздел не найден</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Icon name="MessageCircle" size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AnonChat
              </span>
            </div>

            <div className="flex items-center gap-1">
              {navigation.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(item.id)}
                  className={`transition-all duration-200 ${
                    activeTab === item.id 
                      ? 'bg-gradient-primary hover:bg-gradient-secondary text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon name={item.icon as any} size={16} className="mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse-slow"></div>
                {stats.online_users.toLocaleString()} онлайн
              </Badge>
              <Button variant="outline" size="sm">
                <Icon name="Settings" size={16} className="mr-2" />
                Настройки
              </Button>
              <Button variant="outline" size="sm">
                <Icon name="User" size={16} className="mr-2" />
                {sessionToken ? `Аноним#${sessionToken.slice(-4)}` : 'Аноним#1234'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;