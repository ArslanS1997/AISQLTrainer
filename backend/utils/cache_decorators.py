from functools import wraps
from fastapi_cache.decorator import cache
import hashlib
import json

def cache_with_key(expire: int = 300):  # 5 minutes default
    """Custom cache decorator with dynamic key generation"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [func.__name__]
            
            # Add user_id to cache key for user-specific data
            for arg in args:
                if hasattr(arg, 'id'):
                    key_parts.append(f"user_{arg.id}")
                    break
            
            # Add other relevant arguments
            for key, value in kwargs.items():
                if key not in ['db', 'current_user']:  # Skip internal params
                    key_parts.append(f"{key}_{value}")
            
            cache_key = ":".join(key_parts)
            
            # Use FastAPI cache with custom key
            return await cache(expire=expire, key=cache_key)(func)(*args, **kwargs)
        return wrapper
    return decorator

def cache_static_data(expire: int = 3600):  # 1 hour default for static data
    """Cache decorator for static data like plans and models"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await cache(expire=expire, key=func.__name__)(func)(*args, **kwargs)
        return wrapper
    return decorator

def invalidate_user_cache(user_id: str):
    """Invalidate all cache entries for a specific user"""
    pattern = f"*user_{user_id}*"
    keys = redis_client.keys(pattern)
    if keys:
        redis_client.delete(*keys)

def invalidate_static_cache():
    """Invalidate static data cache (plans, models)"""
    static_keys = ['get_subscription_plans', 'get_available_models']
    for key in static_keys:
        redis_client.delete(key)

def cache_with_smart_invalidation(expire: int = 300):
    """Cache decorator that can be immediately invalidated when needed"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = generate_cache_key(func.__name__, args, kwargs)
            
            # Check if cache should be bypassed (for real-time data)
            force_refresh = kwargs.pop('force_refresh', False)
            
            if force_refresh:
                # Force fresh data, don't use cache
                result = await func(*args, **kwargs)
                # Update cache with fresh data
                redis_client.setex(cache_key, expire, json.dumps(result))
                return result
            
            # Use normal caching
            return await cache(expire=expire, key=cache_key)(func)(*args, **kwargs)
        return wrapper
    return decorator

def force_refresh_user_data(user_id: str):
    """Force refresh of user data by setting force_refresh flag"""
    # Set a flag in Redis that forces cache refresh
    flag_key = f"force_refresh:{user_id}"
    redis_client.setex(flag_key, 60, "true")  # Flag expires in 1 minute
