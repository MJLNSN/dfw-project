"""
JSON file-based storage for user preferences.
Used because the database user (takehome) only has read permissions.

Note: For production, consider using a separate database or AWS DynamoDB.
"""
import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import threading

logger = logging.getLogger(__name__)

# File path for storing preferences
PREFERENCES_FILE = Path(__file__).parent.parent.parent / "data" / "user_preferences.json"

# Thread lock for file operations
_file_lock = threading.Lock()


def ensure_data_dir():
    """Ensure the data directory and file exist."""
    PREFERENCES_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not PREFERENCES_FILE.exists():
        PREFERENCES_FILE.write_text("{}")


def load_all_preferences() -> Dict[str, List[Dict]]:
    """
    Load all user preferences from JSON file.
    
    Returns:
        Dictionary mapping user_id to list of preferences
    """
    ensure_data_dir()
    try:
        with open(PREFERENCES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        logger.warning("Corrupt preferences file, resetting")
        return {}
    except Exception as e:
        logger.error(f"Error loading preferences: {e}")
        return {}


def save_all_preferences(preferences: Dict[str, List[Dict]]):
    """
    Save all preferences to JSON file.
    
    Args:
        preferences: Dictionary of all user preferences
    """
    ensure_data_dir()
    with _file_lock:
        with open(PREFERENCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(preferences, f, indent=2, ensure_ascii=False)


def get_user_preferences(user_id: str) -> List[Dict]:
    """
    Get all preferences for a user.
    
    Args:
        user_id: Cognito user ID (sub claim)
        
    Returns:
        List of preference dictionaries
    """
    all_prefs = load_all_preferences()
    return all_prefs.get(user_id, [])


def get_preference_by_id(user_id: str, preference_id: str) -> Optional[Dict]:
    """
    Get a specific preference by ID.
    
    Args:
        user_id: Cognito user ID
        preference_id: Preference UUID
        
    Returns:
        Preference dictionary or None if not found
    """
    prefs = get_user_preferences(user_id)
    for pref in prefs:
        if pref.get("id") == preference_id:
            return pref
    return None


def create_preference(user_id: str, preference: Dict[str, Any]) -> Dict:
    """
    Create a new preference for a user.
    
    Args:
        user_id: Cognito user ID
        preference: Preference data (name, filters, isDefault)
        
    Returns:
        Created preference with id and timestamps
    """
    all_prefs = load_all_preferences()
    
    if user_id not in all_prefs:
        all_prefs[user_id] = []
    
    # Generate ID and timestamps
    now = datetime.utcnow().isoformat() + "Z"
    new_pref = {
        "id": str(uuid.uuid4()),
        "name": preference.get("name"),
        "filters": preference.get("filters", {}),
        "isDefault": preference.get("isDefault", False),
        "created_at": now,
        "updated_at": now
    }
    
    # If this is default, unset other defaults
    if new_pref["isDefault"]:
        for pref in all_prefs[user_id]:
            pref["isDefault"] = False
    
    all_prefs[user_id].append(new_pref)
    save_all_preferences(all_prefs)
    
    logger.info(f"Created preference {new_pref['id']} for user {user_id}")
    return new_pref


def update_preference(user_id: str, preference_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
    """
    Update an existing preference.
    
    Args:
        user_id: Cognito user ID
        preference_id: Preference UUID to update
        updates: Fields to update
        
    Returns:
        Updated preference or None if not found
    """
    all_prefs = load_all_preferences()
    
    if user_id not in all_prefs:
        return None
    
    for i, pref in enumerate(all_prefs[user_id]):
        if pref.get("id") == preference_id:
            # Update fields
            if "name" in updates and updates["name"] is not None:
                pref["name"] = updates["name"]
            if "filters" in updates and updates["filters"] is not None:
                pref["filters"] = updates["filters"]
            if "isDefault" in updates and updates["isDefault"] is not None:
                # If setting as default, unset others
                if updates["isDefault"]:
                    for other in all_prefs[user_id]:
                        other["isDefault"] = False
                pref["isDefault"] = updates["isDefault"]
            
            pref["updated_at"] = datetime.utcnow().isoformat() + "Z"
            all_prefs[user_id][i] = pref
            save_all_preferences(all_prefs)
            
            logger.info(f"Updated preference {preference_id} for user {user_id}")
            return pref
    
    return None


def delete_preference(user_id: str, preference_id: str) -> bool:
    """
    Delete a preference.
    
    Args:
        user_id: Cognito user ID
        preference_id: Preference UUID to delete
        
    Returns:
        True if deleted, False if not found
    """
    all_prefs = load_all_preferences()
    
    if user_id not in all_prefs:
        return False
    
    original_len = len(all_prefs[user_id])
    all_prefs[user_id] = [p for p in all_prefs[user_id] if p.get("id") != preference_id]
    
    if len(all_prefs[user_id]) < original_len:
        save_all_preferences(all_prefs)
        logger.info(f"Deleted preference {preference_id} for user {user_id}")
        return True
    
    return False


def get_default_preference(user_id: str) -> Optional[Dict]:
    """
    Get the user's default preference.
    
    Args:
        user_id: Cognito user ID
        
    Returns:
        Default preference or None
    """
    prefs = get_user_preferences(user_id)
    for pref in prefs:
        if pref.get("isDefault"):
            return pref
    return None

