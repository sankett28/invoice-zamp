import time
from typing import Any


class SimpleTTLCache:
    """
    Lightweight, high-performance in-memory TTL cache.
    Eliminates redundant roundtrips to remote databases on repeat requests.
    """

    def __init__(self):
        self._cache: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        expire_at, val = self._cache[key]
        if time.time() > expire_at:
            self._cache.pop(key, None)
            return None
        return val

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        self._cache[key] = (time.time() + ttl_seconds, value)

    def invalidate(self, prefix: str | None = None) -> None:
        if not prefix:
            self._cache.clear()
        else:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                self._cache.pop(k, None)


cache = SimpleTTLCache()
