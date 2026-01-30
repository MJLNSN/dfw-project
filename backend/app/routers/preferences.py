"""
User preferences API endpoints.
Allows authenticated users to save and manage filter preferences.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging

from ..auth import require_auth
from ..schemas import PreferenceCreate, PreferenceUpdate, PreferenceResponse
from ..storage.preferences import (
    get_user_preferences,
    get_preference_by_id,
    create_preference,
    update_preference,
    delete_preference,
    get_default_preference
)

router = APIRouter(prefix="/api/v1/preferences", tags=["preferences"])
logger = logging.getLogger(__name__)


@router.get("")
async def list_preferences(user_id: str = Depends(require_auth)):
    """
    Get all saved preferences for the authenticated user.
    """
    try:
        preferences = get_user_preferences(user_id)
        return {"data": preferences}
    except Exception as e:
        logger.error(f"Error listing preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch preferences")


@router.post("", status_code=201)
async def create_new_preference(
    preference: PreferenceCreate,
    user_id: str = Depends(require_auth)
):
    """
    Create a new filter preference.
    
    If isDefault is True, other preferences will be unmarked as default.
    """
    try:
        # Convert Pydantic model to dict
        pref_data = {
            "name": preference.name,
            "filters": preference.filters.model_dump() if preference.filters else {},
            "isDefault": preference.isDefault
        }
        
        new_pref = create_preference(user_id, pref_data)
        return {"data": new_pref}
    except Exception as e:
        logger.error(f"Error creating preference: {e}")
        raise HTTPException(status_code=500, detail="Failed to create preference")


@router.get("/default")
async def get_default(user_id: str = Depends(require_auth)):
    """
    Get the user's default preference.
    
    Returns 404 if no default is set.
    """
    try:
        default_pref = get_default_preference(user_id)
        
        if not default_pref:
            raise HTTPException(status_code=404, detail="No default preference set")
        
        return {"data": default_pref}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting default preference: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch default preference")


@router.get("/{preference_id}")
async def get_preference(
    preference_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Get a specific preference by ID.
    """
    try:
        pref = get_preference_by_id(user_id, preference_id)
        
        if not pref:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        return {"data": pref}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preference {preference_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch preference")


@router.put("/{preference_id}")
async def update_existing_preference(
    preference_id: str,
    updates: PreferenceUpdate,
    user_id: str = Depends(require_auth)
):
    """
    Update an existing preference.
    
    Only provided fields will be updated.
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        update_data = {}
        if updates.name is not None:
            update_data["name"] = updates.name
        if updates.filters is not None:
            update_data["filters"] = updates.filters.model_dump()
        if updates.isDefault is not None:
            update_data["isDefault"] = updates.isDefault
        
        updated_pref = update_preference(user_id, preference_id, update_data)
        
        if not updated_pref:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        return {"data": updated_pref}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating preference {preference_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update preference")


@router.delete("/{preference_id}")
async def delete_existing_preference(
    preference_id: str,
    user_id: str = Depends(require_auth)
):
    """
    Delete a preference.
    """
    try:
        deleted = delete_preference(user_id, preference_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        return {"message": "Preference deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting preference {preference_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete preference")

