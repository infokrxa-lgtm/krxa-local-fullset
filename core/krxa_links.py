import time
from core.krxa_store import read_json, write_json, log_event

TRAVEL_LINKS_PATH = "storage/travel_links_config.json"
TRAVEL_LINKS_HISTORY_PATH = "storage/travel_links_history.json"


DEFAULT_CONFIG = {
    "version": "TRAVEL_LINKS_V1",
    "updated_by": "control",
    "categories": {}
}


def load_links():
    return read_json(TRAVEL_LINKS_PATH, DEFAULT_CONFIG)


def save_links(data, action="save_links", detail=None):
    write_json(TRAVEL_LINKS_PATH, data)
    add_link_history(action, detail or {})
    log_event("travel_links_saved", {"action": action, "detail": detail or {}})
    return data


def load_link_history():
    return read_json(TRAVEL_LINKS_HISTORY_PATH, [])


def add_link_history(action, detail):
    history = load_link_history()
    if not isinstance(history, list):
        history = []

    item = {
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action": action,
        "detail": detail
    }

    history.append(item)
    write_json(TRAVEL_LINKS_HISTORY_PATH, history)
    return item


def get_category(category):
    data = load_links()
    categories = data.get("categories", {})
    return categories.get(category)


def list_categories():
    data = load_links()
    return {
        "ok": True,
        "config": data,
        "history": load_link_history()
    }


def add_user_link(category, name, url):
    data = load_links()
    categories = data.setdefault("categories", {})

    if category not in categories:
        categories[category] = {
            "label": category,
            "default_links": [],
            "user_links": []
        }

    item = {
        "name": (name or "").strip(),
        "url": (url or "").strip()
    }

    if not item["name"] or not item["url"]:
        return {
            "ok": False,
            "reason": "name_or_url_empty"
        }

    categories[category].setdefault("user_links", []).append(item)

    save_links(
        data,
        action="add_user_link",
        detail={
            "category": category,
            "item": item
        }
    )

    return {
        "ok": True,
        "config": data,
        "added": item
    }


def delete_user_link(category, index):
    data = load_links()
    categories = data.get("categories", {})

    if category not in categories:
        return {
            "ok": False,
            "reason": "category_not_found"
        }

    links = categories[category].setdefault("user_links", [])

    try:
        idx = int(index)
        removed = links.pop(idx)
    except Exception:
        return {
            "ok": False,
            "reason": "invalid_index"
        }

    save_links(
        data,
        action="delete_user_link",
        detail={
            "category": category,
            "removed": removed,
            "index": index
        }
    )

    return {
        "ok": True,
        "config": data,
        "removed": removed
    }


def set_default_links(category, links):
    data = load_links()
    categories = data.setdefault("categories", {})

    if category not in categories:
        categories[category] = {
            "label": category,
            "default_links": [],
            "user_links": []
        }

    categories[category]["default_links"] = links

    save_links(
        data,
        action="set_default_links",
        detail={
            "category": category,
            "links": links
        }
    )

    return {
        "ok": True,
        "config": data
    }


def all_links_for_category(category):
    item = get_category(category)

    if not item:
        return {
            "ok": False,
            "reason": "category_not_found",
            "links": []
        }

    links = []
    links.extend(item.get("default_links", []))
    links.extend(item.get("user_links", []))

    return {
        "ok": True,
        "category": category,
        "label": item.get("label", category),
        "links": links
    }