import redis.asyncio as redis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
import os

# Redis connection - Use async Redis client
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', None),
    db=0,
    decode_responses=True
)

# Initialize FastAPI cache
async def init_cache():
    FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
