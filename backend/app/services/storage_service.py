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
            "x-upsert": "true",
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
        headers = {"Authorization": f"Bearer {self.service_key}"}
        urls = [
            f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{storage_path}",
            f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{storage_path}",
        ]
        async with httpx.AsyncClient() as client:
            for url in urls:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        return resp.content
                except Exception:
                    continue
            raise FileNotFoundError(f"Supabase object not found: {storage_path}")


class S3StorageService(StorageService):
    def __init__(self):
        self.bucket = settings.s3_bucket
        self.region = settings.s3_region
        self.access_key = settings.s3_access_key
        self.secret_key = settings.s3_secret_key
        self.endpoint_url = settings.s3_endpoint_url or None

    async def save_file(self, file_bytes: bytes, filename: str, run_id: str) -> str:
        if not self.access_key or not self.secret_key:
            return await LocalStorageService().save_file(file_bytes, filename, run_id)
        try:
            import boto3
            client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                endpoint_url=self.endpoint_url,
            )
            safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
            s3_key = f"invoices/{run_id}/{safe_filename}"
            client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=file_bytes,
                ContentType="application/pdf",
            )
            return s3_key
        except Exception:
            return await LocalStorageService().save_file(file_bytes, filename, run_id)

    async def get_file(self, storage_path: str) -> bytes:
        if not self.access_key or not self.secret_key or os.path.exists(storage_path):
            return await LocalStorageService().get_file(storage_path)
        try:
            import boto3
            client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                endpoint_url=self.endpoint_url,
            )
            resp = client.get_object(Bucket=self.bucket, Key=storage_path)
            return resp["Body"].read()
        except Exception:
            return await LocalStorageService().get_file(storage_path)


def get_storage_service() -> StorageService:
    if settings.storage_backend == "supabase":
        return SupabaseStorageService()
    elif settings.storage_backend == "s3":
        return S3StorageService()
    return LocalStorageService()
