
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import json
import subprocess

router = APIRouter(prefix="/api/krxa", tags=["KRXA AI Gate"])

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
APPROVAL_DIR = DATA_DIR / "approvals"
PATCH_DIR = DATA_DIR / "patches"
LOG_DIR = ROOT / "logs"

APPROVAL_DIR.mkdir(parents=True, exist_ok=True)
PATCH_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

SAFE_READ_EXT = {".py", ".html", ".js", ".css", ".json", ".md", ".txt", ".yml", ".yaml"}
BLOCKED_PARTS = {".git", "__pycache__", ".env", "venv", ".venv", "node_modules"}

class PatchProposal(BaseModel):
    title: str
    reason: str
    risk_level: str = "low"
    target_files: list[str] = []
    patch_text: str
    requested_by: str = "chatgpt"

class ApprovalAction(BaseModel):
    approval_id: str
    memo: str | None = None

def is_safe_path(path_text: str) -> Path:
    path = (ROOT / path_text).resolve()
    if not str(path).startswith(str(ROOT)):
        raise HTTPException(status_code=403, detail="Blocked path")
    for part in path.parts:
        if part in BLOCKED_PARTS:
            raise HTTPException(status_code=403, detail="Blocked directory")
    return path

@router.get("/status")
def get_status():
    try:
        git_commit = subprocess.check_output(
            ["git", "log", "--oneline", "-1"],
            cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        git_commit = "git 정보 확인 실패"

    try:
        git_branch = subprocess.check_output(
            ["git", "branch", "--show-current"],
            cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        git_branch = "branch 정보 확인 실패"

    return {
        "service": "KRXA",
        "gate": "KRXA_AI_GATE_V1",
        "root": str(ROOT),
        "time": datetime.now().isoformat(timespec="seconds"),
        "git_branch": git_branch,
        "git_commit": git_commit,
        "mode": "read_first_approval_required"
    }

@router.get("/logs/recent")
def recent_logs(limit: int = 200):
    logs = []
    for file in sorted(LOG_DIR.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)[:5]:
        try:
            lines = file.read_text(encoding="utf-8", errors="ignore").splitlines()
            logs.append({"file": str(file.relative_to(ROOT)), "lines": lines[-limit:]})
        except Exception as e:
            logs.append({"file": str(file.relative_to(ROOT)), "error": str(e)})
    return {"count": len(logs), "logs": logs}

@router.get("/files/tree")
def file_tree(max_files: int = 300):
    result = []
    for path in ROOT.rglob("*"):
        if len(result) >= max_files:
            break
        rel = path.relative_to(ROOT)
        if any(part in BLOCKED_PARTS for part in rel.parts):
            continue
        if path.is_file() and path.suffix.lower() in SAFE_READ_EXT:
            result.append(str(rel).replace("\\", "/"))
    return {"root": str(ROOT), "count": len(result), "files": result}

@router.get("/files/read")
def read_file(path: str):
    file_path = is_safe_path(path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if file_path.suffix.lower() not in SAFE_READ_EXT:
        raise HTTPException(status_code=403, detail="File type not allowed")
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    return {"path": path, "size": len(text), "content": text}

@router.post("/patch/propose")
def propose_patch(proposal: PatchProposal):
    approval_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    data = {
        "approval_id": approval_id,
        "type": "patch_proposal",
        "status": "pending",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "title": proposal.title,
        "reason": proposal.reason,
        "risk_level": proposal.risk_level,
        "target_files": proposal.target_files,
        "patch_text": proposal.patch_text,
        "requested_by": proposal.requested_by,
        "approval_required": True
    }
    approval_file = APPROVAL_DIR / f"{approval_id}.json"
    approval_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "approval_id": approval_id, "status": "pending"}

@router.get("/approval/list")
def approval_list():
    items = []
    for file in sorted(APPROVAL_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            items.append(json.loads(file.read_text(encoding="utf-8")))
        except Exception:
            continue
    return {"count": len(items), "items": items}

@router.post("/approval/approve")
def approve(action: ApprovalAction):
    file = APPROVAL_DIR / f"{action.approval_id}.json"
    if not file.exists():
        raise HTTPException(status_code=404, detail="Approval not found")
    data = json.loads(file.read_text(encoding="utf-8"))
    data["status"] = "approved"
    data["approved_at"] = datetime.now().isoformat(timespec="seconds")
    data["memo"] = action.memo
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "approval_id": action.approval_id, "status": "approved"}

@router.post("/approval/reject")
def reject(action: ApprovalAction):
    file = APPROVAL_DIR / f"{action.approval_id}.json"
    if not file.exists():
        raise HTTPException(status_code=404, detail="Approval not found")
    data = json.loads(file.read_text(encoding="utf-8"))
    data["status"] = "rejected"
    data["rejected_at"] = datetime.now().isoformat(timespec="seconds")
    data["memo"] = action.memo
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "approval_id": action.approval_id, "status": "rejected"}
