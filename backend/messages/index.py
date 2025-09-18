import json
import os
import psycopg2
from datetime import datetime
from typing import Dict, Any, List
import uuid


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с сообщениями в чате - получение и отправка сообщений
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами: request_id, function_name, function_version
    Returns: HTTP response dict с сообщениями или результатом отправки
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
    
    # Подключение к базе данных
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        
        if method == 'GET':
            # Получение сообщений для канала
            params = event.get('queryStringParameters', {}) or {}
            channel_id = params.get('channel_id', '1')
            limit = min(int(params.get('limit', '50')), 100)
            
            cursor.execute('''
                SELECT m.id, m.content, m.created_at, 
                       au.username, au.avatar_letter
                FROM messages m
                JOIN anonymous_users au ON m.user_id = au.id
                WHERE m.channel_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s
            ''', (channel_id, limit))
            
            messages = []
            for row in cursor.fetchall():
                msg_id, content, created_at, username, avatar = row
                messages.append({
                    'id': msg_id,
                    'user': username,
                    'avatar': avatar,
                    'message': content,
                    'time': created_at.strftime('%H:%M')
                })
            
            # Реверсируем для правильного порядка (старые сверху)
            messages.reverse()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'messages': messages,
                    'channel_id': int(channel_id)
                })
            }
        
        elif method == 'POST':
            # Отправка нового сообщения
            body_data = json.loads(event.get('body', '{}'))
            message_content = body_data.get('message', '').strip()
            channel_id = body_data.get('channel_id', 1)
            session_token = event.get('headers', {}).get('x-session-token', '')
            
            if not message_content:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Сообщение не может быть пустым'})
                }
            
            # Создание или получение пользователя по сессии
            if not session_token:
                # Создаем новую анонимную сессию
                session_token = f"sess_{uuid.uuid4().hex[:12]}"
                username_num = str(uuid.uuid4().int)[:4]
                username = f"Аноним#{username_num}"
                avatar_letter = username[0]
                
                cursor.execute('''
                    INSERT INTO anonymous_users (username, avatar_letter, session_token)
                    VALUES (%s, %s, %s) RETURNING id
                ''', (username, avatar_letter, session_token))
                user_id = cursor.fetchone()[0]
            else:
                # Ищем существующего пользователя
                cursor.execute('''
                    SELECT id, username, avatar_letter FROM anonymous_users 
                    WHERE session_token = %s
                ''', (session_token,))
                result = cursor.fetchone()
                
                if result:
                    user_id, username, avatar_letter = result
                    # Обновляем последнюю активность
                    cursor.execute('''
                        UPDATE anonymous_users 
                        SET last_active = CURRENT_TIMESTAMP, is_online = true
                        WHERE id = %s
                    ''', (user_id,))
                else:
                    # Создаем нового пользователя
                    username_num = str(uuid.uuid4().int)[:4]
                    username = f"Аноним#{username_num}"
                    avatar_letter = username[0]
                    
                    cursor.execute('''
                        INSERT INTO anonymous_users (username, avatar_letter, session_token)
                        VALUES (%s, %s, %s) RETURNING id
                    ''', (username, avatar_letter, session_token))
                    user_id = cursor.fetchone()[0]
            
            # Вставка сообщения
            cursor.execute('''
                INSERT INTO messages (channel_id, user_id, content)
                VALUES (%s, %s, %s) RETURNING id, created_at
            ''', (channel_id, user_id, message_content))
            
            msg_id, created_at = cursor.fetchone()
            
            # Обновляем счетчик сообщений в канале
            cursor.execute('''
                UPDATE channels SET message_count = message_count + 1
                WHERE id = %s
            ''', (channel_id,))
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'message': {
                        'id': msg_id,
                        'user': username,
                        'avatar': avatar_letter,
                        'message': message_content,
                        'time': created_at.strftime('%H:%M')
                    },
                    'session_token': session_token
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