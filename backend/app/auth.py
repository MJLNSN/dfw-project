"""
JWT token verification for AWS Cognito.
Validates tokens issued by Cognito and extracts user information.
"""
import httpx
from jose import jwt, jwk, JWTError
from jose.utils import base64url_decode
from fastapi import HTTPException, Request, Depends
from functools import lru_cache
from typing import Optional, Dict, Any
import logging

from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Cache for JWKS keys
_jwks_cache: Optional[Dict[str, Any]] = None


def get_cognito_public_keys() -> Dict[str, Any]:
    """
    Fetch and cache Cognito public keys (JWKS).
    Keys are used to verify JWT token signatures.
    """
    global _jwks_cache
    
    if _jwks_cache is not None:
        return _jwks_cache
    
    try:
        response = httpx.get(settings.cognito_jwks_url, timeout=10.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        logger.info("Successfully fetched Cognito JWKS")
        return _jwks_cache
    except Exception as e:
        logger.error(f"Failed to fetch Cognito JWKS: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch authentication keys"
        )


def get_key_from_jwks(token: str) -> Dict[str, Any]:
    """
    Find the correct public key from JWKS based on token header.
    """
    try:
        # Get the key ID from token header
        headers = jwt.get_unverified_headers(token)
        kid = headers.get("kid")
        
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token: missing key ID")
        
        # Find matching key in JWKS
        jwks = get_cognito_public_keys()
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key
        
        raise HTTPException(status_code=401, detail="Invalid token: key not found")
    except JWTError as e:
        logger.error(f"JWT error getting key: {e}")
        raise HTTPException(status_code=401, detail="Invalid token format")


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a Cognito JWT token and return claims.
    
    Args:
        token: The JWT token string
        
    Returns:
        Dictionary of token claims
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Get the public key
        key = get_key_from_jwks(token)
        
        # Construct the public key
        public_key = jwk.construct(key)
        
        # Verify and decode the token
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.cognito_client_id,
            issuer=settings.cognito_issuer,
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True
            }
        )
        
        return claims
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTClaimsError as e:
        logger.warning(f"Invalid claims: {e}")
        raise HTTPException(status_code=401, detail="Invalid token claims")
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


async def get_current_user(request: Request) -> Optional[str]:
    """
    Dependency to get current user from Authorization header.
    Returns user_id (sub claim) or None for guests.
    
    This allows both authenticated and guest access.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return None  # Guest mode
    
    if not auth_header.startswith("Bearer "):
        return None  # Invalid format, treat as guest
    
    token = auth_header.replace("Bearer ", "")
    
    if not token:
        return None  # Empty token, treat as guest
    
    try:
        claims = verify_token(token)
        return claims.get("sub")  # Return Cognito User ID
    except HTTPException:
        # Invalid token - could be expired or tampered
        # Return None to treat as guest, or re-raise to block
        raise  # Re-raise to enforce authentication


async def get_optional_user(request: Request) -> Optional[str]:
    """
    Dependency to get current user, allowing guest access.
    Invalid tokens are treated as guest access.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        return None  # Guest mode
    
    token = auth_header.replace("Bearer ", "")
    
    if not token:
        return None  # Guest mode
    
    try:
        claims = verify_token(token)
        return claims.get("sub")
    except HTTPException:
        return None  # Treat invalid token as guest


async def require_auth(request: Request) -> str:
    """
    Dependency that requires authentication.
    Raises 401 if not authenticated.
    """
    user_id = await get_current_user(request)
    
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    return user_id


def get_access_level(user_id: Optional[str]) -> str:
    """
    Determine access level based on authentication status.
    
    Args:
        user_id: The user ID or None for guests
        
    Returns:
        "registered" or "guest"
    """
    return "registered" if user_id else "guest"

