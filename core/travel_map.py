
from urllib.parse import quote_plus

def build_google_maps_search(query: str) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query or '')}"

def build_google_maps_dir(destination: str, origin: str = "") -> str:
    dest = quote_plus(destination or "")
    if origin:
        return f"https://www.google.com/maps/dir/?api=1&origin={quote_plus(origin)}&destination={dest}"
    return f"https://www.google.com/maps/dir/?api=1&destination={dest}"

def build_naver_map_search(query: str) -> str:
    return f"https://map.naver.com/p/search/{quote_plus(query or '')}"

def build_kakao_map_search(query: str) -> str:
    return f"https://map.kakao.com/?q={quote_plus(query or '')}"

def build_map_bundle(name: str, address: str = "") -> dict:
    q = f"{name} {address}".strip()
    return {
        "query": q,
        "google_search": build_google_maps_search(q),
        "google_dir": build_google_maps_dir(q),
        "naver_search": build_naver_map_search(q),
        "kakao_search": build_kakao_map_search(q),
    }
