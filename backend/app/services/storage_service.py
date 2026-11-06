import os
from abc import ABC, abstractmethod
import aiofiles
from app.config import get_settings

settings = get_settings()


class StorageService(ABC):
    @abstractmethod
    async def save_file(self, file_bytes: bytes, filename: str, run_id: str) -> str:
        """Save file bytes and return storage path / key."""
        pass

    @abstractmethod
    async def get_file(self, storage_path: str) -> bytes:
        """Retrieve file bytes from storage."""
        pass


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or settings.local_storage_path
        os.makedirs(self.base_dir, exist_ok=True)

    async def save_file(self, file_bytes: bytes, filename: str, run_id: str) -> str:
        run_folder = os.path.join(self.base_dir, str(run_id))
        os.makedirs(run_folder, exist_ok=True)
        # Sanitise filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
        target_path = os.path.join(run_folder, safe_filename)
        async with aiofiles.open(target_path, "wb") as f:
            await f.write(file_bytes)
        return target_path

    async def get_file(self, storage_path: str) -> bytes:
        if not os.path.exists(storage_path):
            raise FileNotFoundError(f"Stored file not found: {storage_path}")
        async with aiofiles.open(storage_path, "rb") as f:
            return await f.read()


class SupabaseStorageService(StorageService):
    def __init__(self):
        self.supabase_url = settings.supabase_url
        self.service_key = settings.supabase_service_key
        self.bucket = settings.supabase_storage_bucket

    async def save_file(self, file_bytes: bytes, filename: str, run_id: str) -> str:
        # Fall back to local storage if credentials are missing
        if not self.supabase_url or not self.service_key:
            return await LocalStorageService().save_file(file_bytes, filename, run_id)
        
        # Lazy import httpx
        import httpx
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
        storage_path = f"{run_id}/{safe_filename}"
        url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/pdf",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, content=file_bytes)
            if resp.status_code not in (200, 201):
                # Fallback to local
                return await LocalStorageService().save_file(file_bytes, filename, run_id)
        return storage_path

    async def get_file(self, storage_path: str) -> bytes:
        if not self.supabase_url or not self.service_key or os.path.exists(storage_path):
            return await LocalStorageService().get_file(storage_path)
        import httpx
        url = f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{storage_path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.content
            raise FileNotFoundError(f"Supabase object not found: {storage_path}")


def get_storage_service() -> StorageService:
    if settings.storage_backend == "supabase":
        return SupabaseStorageService()
    return LocalStorageService()
