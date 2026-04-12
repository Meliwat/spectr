from services.schema_synthesis import (
    infer_column_type,
    normalize_entity_name,
    synthesize_schema,
)


def test_normalize_entity_name_deduplicates_card_suffix():
    assert normalize_entity_name("product_card") == "products"
    assert normalize_entity_name("product") == "products"


def test_infer_column_type_matches_common_field_patterns():
    assert infer_column_type("user_id") == "uuid"
    assert infer_column_type("created_at") == "timestamptz"
    assert infer_column_type("price") == "numeric"
    assert infer_column_type("quantity") == "integer"
    assert infer_column_type("is_active") == "boolean"


def test_synthesize_schema_merges_entities_and_adds_users_when_auth_is_implied():
    screen_analysis = [
        {
            "name": "Login",
            "route": "/login",
            "purpose": "Authenticate the user",
            "states": [],
            "actions": ["Sign in"],
            "visible_entities": {
                "product_card": ["id", "name", "price"],
                "order": ["id", "user_id", "status"],
            },
        }
    ]
    transitions = [
        {
            "from_screen": "Products",
            "to_screen": "Product Detail",
            "user_action": "Tap product card",
            "implied_data_operation": "READ",
            "implied_entities": {"product": ["description", "image_url"]},
        }
    ]

    schema = synthesize_schema(screen_analysis, transitions)
    table_names = {table["name"] for table in schema["tables"]}

    assert "products" in table_names
    assert "orders" in table_names
    assert "users" in table_names

    products = next(table for table in schema["tables"] if table["name"] == "products")
    product_columns = {column["name"]: column["type"] for column in products["columns"]}
    assert product_columns["price"] == "numeric"
    assert product_columns["image_url"] == "text"

    orders = next(table for table in schema["tables"] if table["name"] == "orders")
    assert {"column": "user_id", "references": "users.id"} in orders["foreign_keys"]
