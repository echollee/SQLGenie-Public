import time

from nlq.business.connection import ConnectionManagement


class ConnectionPoolManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
            cls._instance.connections = {}
        return cls._instance

    def add_pool(self, name: str):
        if name not in self.connections:
            conn_config = ConnectionManagement.get_conn_config_by_name(name)
            pool_size = 8
            if conn_config.options:
                options = conn_config.options
                if options and 'pool_size' in options:
                    pool_size = int(options['pool_size'])
            self.connections[name] = {
                "pool_size": pool_size,
                "active_connections": 0,
                "connections_list": []
            }

    def acquire(self, name: str):
        self.add_pool(name)
        if name in self.connections:
            pool_info = self.connections[name]
            while pool_info["active_connections"] >= pool_info["pool_size"]:
                print(
                    f'{name}.active_connections: {pool_info["active_connections"]} >= {name}.pool_size: {pool_info["pool_size"]}, waiting...')
                time.sleep(1)  # 等待 1 秒后再次尝试
            print(
                f'{name}.active_connections: {pool_info["active_connections"]}, {name}.pool_size: {pool_info["pool_size"]}')
            pool_info["active_connections"] += 1
            connection_id = len(pool_info["connections_list"])
            pool_info["connections_list"].append(f"Connection {connection_id} acquired for {name}")
            return f"Connection acquired for {name}-{connection_id}"
        else:
            raise ValueError(f"No connection pool with name '{name}' found.")

    def release(self, name: str):
        if name in self.connections:
            pool_info = self.connections[name]
            if pool_info["active_connections"] > 0:
                pool_info["active_connections"] -= 1
                connection_id = len(pool_info["connections_list"]) - 1
                pool_info["connections_list"].pop(connection_id)
                return f"Connection released for {name}"
            else:
                return "No active connections to release"
        else:
            raise ValueError(f"No connection pool with name '{name}' found.")
