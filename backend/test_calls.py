import sys
import requests

BASE = "http://127.0.0.1:8000/api"


def post_json(url, payload, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = requests.post(url, json=payload, headers=h)
    print(url, r.status_code, r.text)
    return r


def get(url, headers=None):
    r = requests.get(url, headers=headers)
    print(url, r.status_code, r.text)
    return r


def main():
    # Ensure sports exist implicitly (assume id=1 is Cricket)
    # 1) Register player mmm if needed
    post_json(f"{BASE}/auth/signup/", {
        "username": "mmm",
        "email": "mmm@example.com",
        "password": "12345678",
        "role": "player",
        "sport_name": "Cricket",
    })

    # 2) Login player
    rp = post_json(f"{BASE}/token/", {"username": "mmm", "password": "12345678"})
    access_p = rp.json().get("access") if rp.ok else None

    # 3) Register manager
    post_json(f"{BASE}/auth/signup/", {
        "username": "mgr",
        "email": "mgr@example.com",
        "password": "12345678",
        "role": "manager",
    })
    rm = post_json(f"{BASE}/token/", {"username": "mgr", "password": "12345678"})
    access_m = rm.json().get("access") if rm.ok else None

    # 4) Player profile to get player_id
    hp = {"Authorization": f"Bearer {access_p}"} if access_p else {}
    prof = get(f"{BASE}/player/profile/", headers=hp)
    player_id = None
    try:
        player_id = prof.json().get("player_id") or prof.json().get("player", {}).get("player_id")
    except Exception:
        pass

    # 5) Player requests promotion (assume sport_id=1 for Cricket)
    if access_p:
        post_json(f"{BASE}/promotion/", {"sport_id": 1, "player_id": player_id}, headers=hp)

    # 6) Manager approves first pending promotion
    hm = {"Authorization": f"Bearer {access_m}"} if access_m else {}
    lst = get(f"{BASE}/promotion/", headers=hm)
    try:
        items = lst.json()
        if items:
            pr_id = items[0]["id"]
            # Approve via POST
            r = requests.post(f"{BASE}/promotion/{pr_id}/approve", headers=hm)
            print("approve", r.status_code, r.text)
    except Exception as e:
        print("Approve error:", e)

    # 7) Coach (same user mmm) login again and create a session
    rc = post_json(f"{BASE}/token/", {"username": "mmm", "password": "12345678"})
    access_c = rc.json().get("access") if rc.ok else None
    hc = {"Authorization": f"Bearer {access_c}"} if access_c else {}
    post_json(f"{BASE}/sessions/", {"sport": 1, "title": "Training"}, headers=hc)

    # 8) Leaderboard
    get(f"{BASE}/leaderboard/")


if __name__ == "__main__":
    main()


