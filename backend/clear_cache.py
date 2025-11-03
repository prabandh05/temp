#!/usr/bin/env python
"""
Clear Python cache files
"""
import os
import shutil

def clear_pycache(directory):
    """Recursively remove __pycache__ directories"""
    count = 0
    for root, dirs, files in os.walk(directory):
        if '__pycache__' in dirs:
            cache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(cache_path)
                print(f"✅ Removed: {cache_path}")
                count += 1
            except Exception as e:
                print(f"❌ Failed to remove {cache_path}: {e}")
    
    return count

if __name__ == "__main__":
    print("🧹 Clearing Python cache files...\n")
    count = clear_pycache('.')
    print(f"\n✅ Cleared {count} __pycache__ directories")

