import os
import sys

# 设置环境变量，避免 pymysql 在 Windows 上的 getpass 问题
os.environ.setdefault('USERNAME', 'root')

import pymysql

def rebuild_database():
    try:
        # 连接 MySQL（不指定数据库）
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            charset='utf8mb4',
            autocommit=True
        )
        cursor = conn.cursor()
        
        # 删除旧数据库
        cursor.execute('DROP DATABASE IF EXISTS mumu_freight')
        print('已删除旧数据库 mumu_freight')
        
        # 创建新数据库
        cursor.execute('CREATE DATABASE mumu_freight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        print('已创建新数据库 mumu_freight')
        
        cursor.close()
        conn.close()
        print('数据库重建完成！')
        return True
    except Exception as e:
        print(f'错误: {e}')
        return False

if __name__ == '__main__':
    rebuild_database()
