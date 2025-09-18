import json
import os
import psycopg2
from typing import Dict, Any


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для получения списка серверов и каналов чата
    Args: event - dict с httpMethod, queryStringParameters
          context - объект с атрибутами: request_id, function_name, function_version
    Returns: HTTP response dict со списком серверов или каналов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Обработка CORS OPTIONS запроса
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Только GET запросы поддерживаются'})
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor()
        
        params = event.get('queryStringParameters', {}) or {}
        data_type = params.get('type', 'servers')
        
        if data_type == 'servers':
            # Получение списка серверов
            cursor.execute('''
                SELECT id, name, emoji, description, member_count, online_count
                FROM servers
                ORDER BY member_count DESC
            ''')
            
            servers = []
            for row in cursor.fetchall():
                server_id, name, emoji, description, member_count, online_count = row
                servers.append({
                    'id': server_id,
                    'name': name,
                    'emoji': emoji,
                    'description': description,
                    'members': member_count,
                    'online': online_count
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'servers': servers})
            }
        
        elif data_type == 'channels':
            # Получение списка каналов
            server_id = params.get('server_id')
            
            if server_id:
                # Каналы конкретного сервера
                cursor.execute('''
                    SELECT c.id, c.name, c.topic, c.message_count, c.channel_type,
                           s.name as server_name
                    FROM channels c
                    JOIN servers s ON c.server_id = s.id
                    WHERE c.server_id = %s
                    ORDER BY c.name
                ''', (server_id,))
            else:
                # Все каналы
                cursor.execute('''
                    SELECT c.id, c.name, c.topic, c.message_count, c.channel_type,
                           s.name as server_name
                    FROM channels c
                    JOIN servers s ON c.server_id = s.id
                    ORDER BY c.message_count DESC
                ''')
            
            channels = []
            for row in cursor.fetchall():
                channel_id, name, topic, msg_count, ch_type, server_name = row
                channels.append({
                    'id': channel_id,
                    'name': name,
                    'topic': topic,
                    'messages': msg_count,
                    'type': ch_type,
                    'server_name': server_name
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'channels': channels})
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неизвестный тип данных. Используйте: servers или channels'})
            }
    
    except Exception as e:
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