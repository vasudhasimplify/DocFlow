"""
Authentication module for DocFlow
Handles user authentication and authorization
"""

from fastapi import Depends, HTTPException, Header
from typing import Optional
import os
import jwt
from functools import lru_cache


class User:
    """User object from JWT token"""
    def __init__(self, user_id: str, email: str = None, user_metadata: dict = None):
        self.id = user_id
        self.email = email
        self.user_metadata = user_metadata or {}


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """
    Get current authenticated user from JWT token
    Expects: Authorization: Bearer <jwt_token>
    
    For now, we'll implement a simple version that extracts user_id from token
    In production, this should validate the JWT properly
    """
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # For Supabase JWT, we can decode without verification in development
        # In production, you should verify the signature
        try:
            # Try to decode the token (without verification for now)
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
            
            return User(
                user_id=user_id,
                email=email,
                user_metadata={"full_name": payload.get("name", "User")}
            )
        except jwt.DecodeError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def get_user_id_from_token(token: str) -> str:
    """Extract user ID from JWT token"""
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub")
    except:
        return None
