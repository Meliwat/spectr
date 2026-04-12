from __future__ import annotations

import re
from copy import deepcopy


AUTH_KEYWORDS = {
    "login",
    "sign in",
    "sign-in",
    "signup",
    "sign up",
    "register",
    "profile",
    "account",
    "user",
}


def pluralize_name(name: str) -> str:
    if name.endswith("ies"):
        return name
    if name.endswith("y") and not name.endswith(("ay", "ey", "iy", "oy", "uy")):
        return f"{name[:-1]}ies"
    if name.endswith("s"):
        return name
    return f"{name}s"


def singularize_name(name: str) -> str:
    if name.endswith("ies") and len(name) > 3:
        return f"{name[:-3]}y"
    if name.endswith("ses"):
        return name[:-2]
    if name.endswith("s") and len(name) > 1:
        return name[:-1]
    return name


def normalize_entity_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", (name or "").strip().lower()).strip("_")
    if not slug:
        return "records"
    for suffix in ("_card", "_item", "_cell", "_row", "_tile"):
        if slug.endswith(suffix):
            slug = slug[: -len(suffix)]
            break
    return pluralize_name(slug)


def infer_column_type(field_name: str) -> str:
    name = (field_name or "").strip().lower()
    if name == "id" or name.endswith("_id"):
        return "uuid"
    if name.endswith("_at"):
        return "timestamptz"
    if name.endswith("_url") or name in {"url", "image", "image_url", "avatar", "avatar_url"}:
        return "text"
    if any(token in name for token in ("price", "cost", "amount", "subtotal", "total", "fee")):
        return "numeric"
    if name in {"count", "quantity"} or name.endswith("_count") or name.endswith("_quantity"):
        return "integer"
    if name.startswith("is_") or name.startswith("has_") or name.startswith("can_"):
        return "boolean"
    if name in {"name", "title", "description", "subtitle", "label", "status", "email", "phone"}:
        return "text"
    return "text"


def _auth_implied(screen_analysis: list[dict], transitions: list[dict]) -> bool:
    haystacks: list[str] = []
    for screen in screen_analysis:
        haystacks.extend(
            [
                screen.get("name", ""),
                screen.get("route", ""),
                screen.get("purpose", ""),
                *screen.get("states", []),
                *screen.get("actions", []),
            ]
        )
    for transition in transitions:
        haystacks.extend(
            [
                transition.get("from_screen", ""),
                transition.get("to_screen", ""),
                transition.get("user_action", ""),
            ]
        )
    joined = " \n".join(h.lower() for h in haystacks)
    return any(keyword in joined for keyword in AUTH_KEYWORDS)


def _merge_entity_fields(target: dict[str, set[str]], visible_entities: dict | None) -> None:
    if not visible_entities:
        return
    for raw_name, raw_fields in visible_entities.items():
        table_name = normalize_entity_name(raw_name)
        target.setdefault(table_name, set())
        for field in raw_fields or []:
            clean = re.sub(r"[^a-z0-9_]+", "_", str(field).strip().lower()).strip("_")
            if clean:
                target[table_name].add(clean)


def _add_foreign_keys(schema: dict) -> None:
    table_names = {table["name"] for table in schema["tables"]}
    for table in schema["tables"]:
        fks: list[dict] = []
        seen_columns: set[str] = set()
        for column in table["columns"]:
            name = column["name"]
            if not name.endswith("_id") or name == "id":
                continue
            candidate = pluralize_name(singularize_name(name[:-3]))
            if candidate in table_names and name not in seen_columns:
                column["type"] = "uuid"
                fks.append({"column": name, "references": f"{candidate}.id"})
                seen_columns.add(name)
        table["foreign_keys"] = fks


def synthesize_schema(screen_analysis: list[dict], transitions: list[dict]) -> dict:
    entities: dict[str, set[str]] = {}

    for screen in screen_analysis:
        _merge_entity_fields(entities, screen.get("visible_entities"))
    for transition in transitions:
        _merge_entity_fields(entities, transition.get("implied_entities"))

    if _auth_implied(screen_analysis, transitions):
        entities.setdefault("users", set())
        entities["users"].update({"email", "name", "avatar_url"})

    tables: list[dict] = []
    for table_name in sorted(entities):
        fields = set(entities[table_name])
        fields.discard("id")
        fields.discard("created_at")
        columns = [
            {
                "name": "id",
                "type": "uuid",
                "constraints": ["primary key", "default gen_random_uuid()"],
            },
            {
                "name": "created_at",
                "type": "timestamptz",
                "constraints": ["default now()"],
            },
        ]
        for field in sorted(fields):
            columns.append(
                {
                    "name": field,
                    "type": infer_column_type(field),
                    "constraints": [],
                }
            )
        tables.append({"name": table_name, "columns": columns, "foreign_keys": []})

    schema = {"tables": tables, "auth_required": _auth_implied(screen_analysis, transitions)}
    _add_foreign_keys(schema)
    return schema


def render_typescript_contract(schema: dict) -> str:
    lines = ["export interface DatabaseTables {"]
    for table in schema.get("tables", []):
        interface_name = "".join(part.capitalize() for part in singularize_name(table["name"]).split("_"))
        lines.append(f"  {table['name']}: {interface_name}[]")
    lines.append("}")
    return "\n".join(lines)


def clone_schema(schema: dict) -> dict:
    return deepcopy(schema)
