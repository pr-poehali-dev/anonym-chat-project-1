import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime, timedelta


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления онлайн-статусом пользователей и получения статистики
    Args: event - dict с httpMethod, headers для session_token
          context - объект с атрибутами: request_id, function_name, function_version
    Returns: HTTP response dict со статистикой онлайн пользователей
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Обработка CORS OPTIONS запроса
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        
        if method == 'GET':
            # Получение статистики онлайн пользователей
            # Считаем пользователей активными, если они были активны в последние 5 минут
            five_minutes_ago = datetime.now() - timedelta(minutes=5)
            
            cursor.execute('''
                UPDATE anonymous_users 
                SET is_online = false 
                WHERE last_active < %s AND is_online = true
            ''', (five_minutes_ago,))
            
            # Получаем общую статистику
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE is_online = true) as online_users,
                    COUNT(*) FILTER (WHERE last_active > %s) as active_today
                FROM anonymous_users
            ''', (datetime.now() - timedelta(days=1),))
            
            stats = cursor.fetchone()
            total_users, online_users, active_today = stats
            
            # Получаем список сообщений за сегодня
            cursor.execute('''
                SELECT COUNT(*) FROM messages 
                WHERE created_at >= CURRENT_DATE
            ''')
            messages_today = cursor.fetchone()[0]
            
            # Обновляем статистику серверов (примерные данные)
            cursor.execute('''
                UPDATE servers SET 
                    online_count = CASE 
                        WHEN name = 'Общий чат' THEN %s
                        WHEN name = 'Игроки' THEN %s  
                        WHEN name = 'Творчество' THEN %s
                        WHEN name = 'Музыка' THEN %s
                        ELSE online_count
                    END
            ''', (
                max(200, online_users * 4), 
                max(150, online_users * 3), 
                max(50, online_users), 
                max(80, online_users * 2)
            ))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'total_users': total_users,
                    'online_users': max(online_users, 200),  # Минимум для демо
                    'active_today': active_today,
                    'messages_today': max(messages_today, 1000),  # Минимум для демо
                    'updated_at': datetime.now().isoformat()
                })
            }
        
        elif method == 'POST':
            # Обновление статуса пользователя (heartbeat)
            headers = event.get('headers', {})
            session_token = headers.get('x-session-token', '')
            
            if not session_token:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Токен сессии не найден'})
                }
            
            # Обновляем последнюю активность пользователя
            cursor.execute('''
                UPDATE anonymous_users 
                SET last_active = CURRENT_TIMESTAMP, is_online = true
                WHERE session_token = %s
                RETURNING id, username
            ''', (session_token,))
            
            result = cursor.fetchone()
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь не найден'})
                }
            
            user_id, username = result
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'user_id': user_id,
                    'username': username,
                    'last_active': datetime.now().isoformat()
                })
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Метод не поддерживается'})
            }
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка сервера: {str(e)}'})
        }
    
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()