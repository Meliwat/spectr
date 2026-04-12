from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .schema_synthesis import singularize_name

try:
    from pglast import parse_sql
except ImportError:  # pragma: no cover - optional at runtime
    parse_sql = None


EXPO_TEMPLATE_VERSIONS = {
    "expo": "~54.0.33",
    "expo_router": "~6.0.23",
    "expo_status_bar": "~3.0.9",
    "expo_vector_icons": "^14.1.0",
    "react": "19.1.0",
    "react_dom": "19.1.0",
    "react_native": "0.81.5",
    "react_native_web": "^0.21.0",
    "gesture_handler": "~2.28.0",
    "safe_area_context": "~5.6.0",
    "screens": "~4.16.0",
    "react_navigation": "^7.1.8",
    "supabase_js": "^2.103.0",
    "typescript": "~5.9.2",
    "types_react": "~19.1.0",
}

MOBILE_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "mobile"
LOCKED_MOBILE_FILES_MANIFEST = MOBILE_TEMPLATE_DIR / "locked_files.txt"


def _load_locked_mobile_files() -> set[str]:
    if not LOCKED_MOBILE_FILES_MANIFEST.exists():
        raise FileNotFoundError(f"Missing locked mobile manifest: {LOCKED_MOBILE_FILES_MANIFEST}")
    entries = {
        line.strip()
        for line in LOCKED_MOBILE_FILES_MANIFEST.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    }
    if not entries:
        raise ValueError(f"Locked mobile manifest is empty: {LOCKED_MOBILE_FILES_MANIFEST}")
    return entries


LOCKED_MOBILE_FILES = _load_locked_mobile_files()
LOCKED_COMPONENT_EXPORTS = {
    "AppText",
    "AppScreen",
    "SearchBar",
    "SectionHeader",
    "SectionCard",
    "BottomTabBar",
    "FoodImage",
    "ui",
}


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return slug or "spectr-mobile-app"


def infer_demo_value(table: str, column: dict, row_idx: int, ids: dict[str, list[str]]) -> object:
    name = column["name"]
    col_type = column["type"]

    if name == "id":
        return ids[table][row_idx]
    if name == "created_at":
        return (datetime(2025, 1, 1, tzinfo=UTC) + timedelta(days=row_idx)).isoformat()
    if name.endswith("_id"):
        target = re.sub(r"_id$", "", name)
        target_table = target if target.endswith("s") else f"{target}s"
        target_ids = ids.get(target_table)
        if target_ids:
            return target_ids[row_idx % len(target_ids)]
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{table}-{name}-{row_idx}"))
    if name in {"name", "title", "label"}:
        return f"{singularize_name(table).replace('_', ' ').title()} {row_idx + 1}"
    if name in {"description", "subtitle"}:
        return f"Sample {singularize_name(table).replace('_', ' ')} description {row_idx + 1}"
    if name == "status":
        return ["active", "draft", "completed", "scheduled"][row_idx % 4]
    if name == "email":
        return f"user{row_idx + 1}@example.com"
    if name == "phone":
        return f"555-010{row_idx:02d}"
    if name.endswith("_url") or name in {"avatar_url", "image_url"}:
        return f"https://picsum.photos/seed/{table}-{row_idx + 1}/800/800"
    if col_type == "numeric":
        return round(9.99 + (row_idx * 3.75), 2)
    if col_type == "integer":
        return row_idx + 1
    if col_type == "boolean":
        return row_idx % 2 == 0
    if col_type == "timestamptz":
        return (datetime(2025, 1, 1, tzinfo=UTC) + timedelta(days=row_idx)).isoformat()
    return f"{name.replace('_', ' ')} {row_idx + 1}"


def generate_demo_rows(schema: dict, row_count: int = 10) -> dict[str, list[dict]]:
    ids: dict[str, list[str]] = {}
    for table in schema.get("tables", []):
        ids[table["name"]] = [
            str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{table['name']}-{index}"))
            for index in range(row_count)
        ]

    dataset: dict[str, list[dict]] = {}
    for table in schema.get("tables", []):
        rows: list[dict] = []
        for row_idx in range(row_count):
            row = {}
            for column in table.get("columns", []):
                row[column["name"]] = infer_demo_value(table["name"], column, row_idx, ids)
            rows.append(row)
        dataset[table["name"]] = rows
    return dataset


def render_migration_sql(schema: dict) -> str:
    statements = ['create extension if not exists "pgcrypto";', ""]
    for table in schema.get("tables", []):
        column_lines = []
        for column in table.get("columns", []):
            constraint_sql = f" {' '.join(column['constraints'])}" if column.get("constraints") else ""
            fk = next((fk for fk in table.get("foreign_keys", []) if fk["column"] == column["name"]), None)
            if fk:
                ref_table, ref_column = fk["references"].split(".", 1)
                fk_sql = f" references public.{ref_table}({ref_column})"
            else:
                fk_sql = ""
            column_lines.append(f"  {column['name']} {column['type']}{constraint_sql}{fk_sql}")
        statements.append(f"create table if not exists public.{table['name']} (\n" + ",\n".join(column_lines) + "\n);")
        statements.append(f"alter table public.{table['name']} enable row level security;")
        statements.append(f"drop policy if exists \"Public read {table['name']}\" on public.{table['name']};")
        statements.append(
            f"create policy \"Public read {table['name']}\" on public.{table['name']}\n"
            f"for select to anon, authenticated using (true);"
        )
        statements.append("")
    return "\n".join(statements).strip() + "\n"


def _sql_literal(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def render_seed_sql(schema: dict, dataset: dict[str, list[dict]]) -> str:
    statements = []
    for table in schema.get("tables", []):
        rows = dataset.get(table["name"], [])
        if not rows:
            continue
        columns = [column["name"] for column in table.get("columns", [])]
        statements.append(f"insert into public.{table['name']} ({', '.join(columns)}) values")
        value_lines = []
        for row in rows:
            value_lines.append(
                "(" + ", ".join(_sql_literal(row[column]) for column in columns) + ")"
            )
        statements.append(",\n".join(value_lines) + "\non conflict (id) do nothing;")
        statements.append("")
    return "\n".join(statements).strip() + "\n"


def render_typescript_types(schema: dict) -> str:
    lines = ["export interface DatabaseTables {"]
    for table in schema.get("tables", []):
        interface_name = "".join(part.capitalize() for part in singularize_name(table["name"]).split("_"))
        lines.append(f"  {table['name']}: {interface_name}[]")
    lines.append("}")
    lines.append("")
    for table in schema.get("tables", []):
        interface_name = "".join(part.capitalize() for part in singularize_name(table["name"]).split("_"))
        lines.append(f"export interface {interface_name} {{")
        for column in table.get("columns", []):
            lines.append(f"  {column['name']}: {typescript_type(column['type'])}")
        lines.append("  [key: string]: any")
        lines.append("}")
        lines.append("")
    lines.extend(
        [
            "export type TableName = keyof DatabaseTables",
            "export type TableRow<T extends TableName> = DatabaseTables[T][number]",
            "",
        ]
    )
    return "\n".join(lines).strip() + "\n"


def typescript_type(sql_type: str) -> str:
    mapping = {
        "uuid": "string",
        "timestamptz": "string",
        "numeric": "number",
        "integer": "number",
        "boolean": "boolean",
        "text": "string",
    }
    return mapping.get(sql_type, "string")


def render_demo_data_file(dataset: dict[str, list[dict]]) -> str:
    return (
        "import { DatabaseTables } from './types'\n\n"
        f"export const demoData: DatabaseTables = {json.dumps(dataset, indent=2)} as DatabaseTables\n"
    )


def render_supabase_client() -> str:
    return """import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const looksConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
)

export const hasSupabaseConfig = looksConfigured

export const supabase: SupabaseClient | null = looksConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null
"""


def render_data_helpers() -> str:
    return """import { demoData } from './demo-data'
import { hasSupabaseConfig, supabase } from './supabase'

export type QueryOptions<T> = {
  select?: string
  limit?: number
  match?: Record<string, unknown>
  fallback?: T[]
}

export type SingleQueryOptions<T> = {
  match?: Record<string, unknown>
  fallback?: T | null
}

export const dataMode = hasSupabaseConfig && supabase ? 'live' : 'demo'

const demoTables = demoData as unknown as Record<string, any[]>

function applyMatch<T>(rows: T[], match?: Record<string, unknown>): T[] {
  if (!match || Object.keys(match).length === 0) {
    return rows
  }

  return rows.filter((row) =>
    Object.entries(match).every(([key, value]) => (row as Record<string, unknown>)[key] === value)
  )
}

export async function listRows<T = any>(table: string, options: QueryOptions<T> = {}): Promise<T[]> {
  const { select = '*', limit = 50, match, fallback } = options
  const demoRows = applyMatch((demoTables[table] ?? []) as T[], match).slice(0, limit)

  if (!hasSupabaseConfig || !supabase) {
    return fallback ?? demoRows
  }

  let query = supabase.from(table).select(select).limit(limit)
  if (match && Object.keys(match).length > 0) {
    query = query.match(match)
  }

  const { data, error } = await query
  if (error || !data) {
    return fallback ?? demoRows
  }

  return data as T[]
}

export async function getRow<T = any>(table: string, options: SingleQueryOptions<T> = {}): Promise<T | null> {
  const { match = {}, fallback = null } = options
  const demoRows = applyMatch((demoTables[table] ?? []) as T[], match)
  const demoRow = demoRows[0] ?? fallback

  if (!hasSupabaseConfig || !supabase) {
    return demoRow
  }

  let query = supabase.from(table).select('*')
  if (Object.keys(match).length > 0) {
    query = query.match(match)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) {
    return demoRow
  }

  return data as T
}

export function listTableNames(): string[] {
  return Object.keys(demoTables)
}
"""


def render_readme(app_name: str, reference_app: str, route_manifest: list[dict], schema: dict) -> str:
    route_lines = "\n".join(f"- `{route['route']}` → `{route['file_path']}`" for route in route_manifest[:12]) or "- Routes are generated from the screen analysis."
    table_lines = "\n".join(f"- `{table['name']}`" for table in schema.get("tables", [])) or "- No tables detected."
    return f"""# {app_name}

Generated by Spectr from a recording of **{reference_app}**.

## What is included

- Expo Router mobile scaffold
- Supabase migration and seed files
- Demo mode data so the app still opens before backend setup
- Typed table interfaces and data helpers

## Run locally

```bash
./setup.sh
npx expo start
```

Scan the QR code with Expo Go once Metro is running.

## Live data setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env`.
3. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Apply `supabase/migrations/001_initial.sql`.
5. Run `supabase/seed.sql`.

If env vars are missing, the app automatically falls back to demo data.

## Detected routes

{route_lines}

## Detected tables

{table_lines}
"""


def render_env_example() -> str:
    return """# Supabase project URL: https://supabase.com/dashboard/project/_/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anon key: https://supabase.com/dashboard/project/_/settings/api
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
"""


def render_setup_sh() -> str:
    return """#!/bin/bash
set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
fi

npm install --include=dev
echo ""
echo "Next:"
echo "  1. Update .env with your Supabase values if you want live data"
echo "  2. Run: npx expo start"
"""


def render_package_json(app_name: str) -> str:
    package = {
        "name": slugify_name(app_name),
        "version": "1.0.0",
        "private": True,
        "main": "expo-router/entry",
        "scripts": {
            "start": "expo start",
            "android": "expo start --android",
            "ios": "expo start --ios",
            "web": "expo start --web",
            "typecheck": "tsc --noEmit",
        },
        "dependencies": {
            "@react-navigation/native": EXPO_TEMPLATE_VERSIONS["react_navigation"],
            "@supabase/supabase-js": EXPO_TEMPLATE_VERSIONS["supabase_js"],
            "@expo/vector-icons": EXPO_TEMPLATE_VERSIONS["expo_vector_icons"],
            "expo": EXPO_TEMPLATE_VERSIONS["expo"],
            "expo-router": EXPO_TEMPLATE_VERSIONS["expo_router"],
            "expo-status-bar": EXPO_TEMPLATE_VERSIONS["expo_status_bar"],
            "react": EXPO_TEMPLATE_VERSIONS["react"],
            "react-dom": EXPO_TEMPLATE_VERSIONS["react_dom"],
            "react-native": EXPO_TEMPLATE_VERSIONS["react_native"],
            "react-native-gesture-handler": EXPO_TEMPLATE_VERSIONS["gesture_handler"],
            "react-native-web": EXPO_TEMPLATE_VERSIONS["react_native_web"],
            "react-native-safe-area-context": EXPO_TEMPLATE_VERSIONS["safe_area_context"],
            "react-native-screens": EXPO_TEMPLATE_VERSIONS["screens"],
        },
        "devDependencies": {
            "@types/react": EXPO_TEMPLATE_VERSIONS["types_react"],
            "babel-preset-expo": "~54.0.10",
            "typescript": EXPO_TEMPLATE_VERSIONS["typescript"],
        },
    }
    return json.dumps(package, indent=2) + "\n"


def render_app_json(app_name: str) -> str:
    slug = slugify_name(app_name)
    config = {
        "expo": {
            "name": app_name,
            "slug": slug,
            "scheme": slug.replace("-", ""),
            "version": "1.0.0",
            "orientation": "portrait",
            "userInterfaceStyle": "dark",
            "plugins": ["expo-router"],
        }
    }
    return json.dumps(config, indent=2) + "\n"


def render_babel_config() -> str:
    return """module.exports = function(api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
"""


def render_tsconfig() -> str:
    return """{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/app/*": ["./app/*"],
      "@/src/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "expo-env.d.ts"
  ]
}
"""


def render_expo_env_types() -> str:
    return """/// <reference types="expo/types" />
"""


def render_root_layout() -> str:
    return """import 'react-native-gesture-handler'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050816' },
        }}
      />
    </GestureHandlerRootView>
  )
}
"""


def render_not_found() -> str:
    return """import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#050816', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#f8fafc', fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Route not found</Text>
      <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>
        This screen is not part of the generated route manifest.
      </Text>
      <Link href="/" asChild>
        <Pressable style={{ backgroundColor: '#706dff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Go home</Text>
        </Pressable>
      </Link>
    </View>
  )
}
"""


def render_theme_tokens() -> str:
    return """export const Colors = {
  background: '#050816',
  surface: '#0b1020',
  surfaceAlt: '#11182d',
  card: '#0f1728',
  border: 'rgba(255,255,255,0.08)',
  text: '#f8fafc',
  textSecondary: '#a8b3cf',
  muted: '#a8b3cf',
  accent: '#706dff',
  accentSoft: 'rgba(112,109,255,0.18)',
  dashpass: '#6d28d9',
  pillBg: 'rgba(255,255,255,0.08)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  page: 20,
} as const

export const Radii = {
  sm: 12,
  card: 18,
  pill: 999,
} as const

export const FontSize = {
  caption: 12,
  badge: 13,
  meta: 14,
  body: 16,
  section: 20,
  title: 28,
  hero: 34,
} as const

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
} as const

export const tokens = {
  colors: Colors,
  spacing: Spacing,
  radii: Radii,
  fontSize: FontSize,
  fontWeight: FontWeight,
  shadows: Shadows,
} as const
"""


def render_theme_styles() -> str:
    return """import { StyleSheet } from 'react-native'
import { Colors, FontSize, FontWeight, Radii, Spacing } from './tokens'

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.page,
    paddingVertical: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
})
"""


def render_component_app_text() -> str:
    return """import React from 'react'
import { Text, type TextProps, type TextStyle } from 'react-native'
import { Colors, FontSize, FontWeight } from '@/src/theme/tokens'

export type AppTextVariant =
  | 'pageTitle'
  | 'sectionHeading'
  | 'greeting'
  | 'restaurantName'
  | 'itemName'
  | 'body'
  | 'meta'
  | 'badge'
  | 'cta'

const variantStyles: Record<AppTextVariant, TextStyle> = {
  pageTitle: { fontSize: FontSize.hero, fontWeight: FontWeight.bold, lineHeight: 38 },
  sectionHeading: { fontSize: FontSize.section, fontWeight: FontWeight.bold, lineHeight: 26 },
  greeting: { fontSize: FontSize.title, fontWeight: FontWeight.bold, lineHeight: 34 },
  restaurantName: { fontSize: 18, fontWeight: FontWeight.semibold, lineHeight: 23 },
  itemName: { fontSize: 17, fontWeight: FontWeight.semibold, lineHeight: 22 },
  body: { fontSize: FontSize.body, fontWeight: FontWeight.regular, lineHeight: 22 },
  meta: { fontSize: FontSize.meta, fontWeight: FontWeight.regular, lineHeight: 18 },
  badge: { fontSize: FontSize.badge, fontWeight: FontWeight.semibold, lineHeight: 16 },
  cta: { fontSize: FontSize.body, fontWeight: FontWeight.bold, lineHeight: 20 },
}

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant
  color?: string
}

export default function AppText({
  variant = 'body',
  color = Colors.text,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text style={[variantStyles[variant], { color }, style]} {...rest}>
      {children}
    </Text>
  )
}
"""


def render_component_app_screen() -> str:
    return """import React, { type PropsWithChildren } from 'react'
import { View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sharedStyles } from '@/src/theme/styles'

export interface AppScreenProps extends PropsWithChildren {
  style?: ViewStyle
}

export default function AppScreen({
  children,
  style,
}: AppScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={[sharedStyles.screen, style]}>{children}</View>
    </SafeAreaView>
  )
}
"""


def render_component_search_bar() -> str:
    return """import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import AppText from '@/src/components/AppText'
import { Colors, Radii, Spacing } from '@/src/theme/tokens'

export interface SearchBarProps {
  placeholder: string
  onPress?: () => void
}

export default function SearchBar({
  placeholder,
  onPress,
}: SearchBarProps) {
  return (
    <Pressable style={styles.root} onPress={onPress} android_ripple={{ color: 'rgba(255,255,255,0.06)' }}>
      <Ionicons name="search" size={18} color={Colors.textSecondary} />
      <AppText variant="body" color={Colors.textSecondary} style={styles.text}>
        {placeholder}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    minHeight: 48,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  text: {
    marginLeft: 10,
  },
})
"""


def render_component_section_header() -> str:
    return """import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import AppText from '@/src/components/AppText'
import { Colors, Spacing } from '@/src/theme/tokens'

export interface SectionHeaderProps {
  title: string
  onPress?: () => void
  showArrow?: boolean
}

export default function SectionHeader({
  title,
  onPress,
  showArrow = true,
}: SectionHeaderProps) {
  const content = (
    <View style={styles.row}>
      <AppText variant="sectionHeading">{title}</AppText>
      {showArrow ? <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} /> : null}
    </View>
  )

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>
  }

  return content
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.page,
    marginBottom: 12,
    marginTop: 8,
  },
})
"""


def render_component_section_card() -> str:
    return """import React, { type PropsWithChildren } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { Colors, Radii, Shadows, Spacing } from '@/src/theme/tokens'

export interface SectionCardProps extends PropsWithChildren {
  style?: ViewStyle
  padded?: boolean
  bordered?: boolean
}

export default function SectionCard({
  children,
  style,
  padded = true,
  bordered = false,
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        bordered && styles.bordered,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    ...Shadows.card,
  },
  padded: {
    padding: Spacing.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
})
"""


def render_component_bottom_tab_bar() -> str:
    return """import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { usePathname, useRouter } from 'expo-router'
import AppText from '@/src/components/AppText'
import { Colors, Radii, Spacing } from '@/src/theme/tokens'

const tabs = [
  { href: '/', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { href: '/browse', label: 'Browse', icon: 'grid-outline', activeIcon: 'grid' },
  { href: '/me', label: 'Me', icon: 'person-outline', activeIcon: 'person' },
] as const

export interface BottomTabBarProps {}

export default function BottomTabBar(_props: BottomTabBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <View style={styles.shell}>
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Pressable key={tab.href} style={styles.tab} onPress={() => router.push(tab.href)}>
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as keyof typeof Ionicons.glyphMap}
              size={20}
              color={active ? Colors.accent : Colors.textSecondary}
            />
            <AppText variant="badge" color={active ? Colors.text : Colors.textSecondary} style={{ marginTop: 4 }}>
              {tab.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: Spacing.page,
    right: Spacing.page,
    bottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
})
"""


def render_component_food_image() -> str:
    return """import React from 'react'
import { Image, type ImageStyle, type StyleProp } from 'react-native'

export interface FoodImageProps {
  uri?: string
  seed: string
  style?: StyleProp<ImageStyle>
  borderRadius?: number
}

export default function FoodImage({
  uri,
  seed,
  style,
  borderRadius,
}: FoodImageProps) {
  const source = {
    uri: uri && uri.length > 0 ? uri : `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/900`,
  }

  return <Image source={source} style={[style, borderRadius != null ? { borderRadius } : null]} resizeMode="cover" />
}
"""


def render_ui_components() -> str:
    return """export { default as AppText } from './AppText'
export { default as AppScreen } from './AppScreen'
export { default as SearchBar } from './SearchBar'
export { default as SectionHeader } from './SectionHeader'
export { default as SectionCard } from './SectionCard'
export { default as BottomTabBar } from './BottomTabBar'
export { default as FoodImage } from './FoodImage'
"""


def render_fallback_module() -> str:
    return """import { demoData } from './demo-data'

const tables = demoData as unknown as Record<string, any[]>

const rows = (table: string) => (tables[table] ?? []) as any[]
const first = (table: string, fallback: Record<string, any>) => rows(table)[0] ?? fallback

export const DEMO_RESTAURANTS = rows('restaurants')
export const DEMO_CATEGORIES = rows('categories')
export const DEMO_PROMOTIONS = rows('promotions')
export const DEMO_CUISINES = rows('cuisines')
export const DEMO_MENU_ITEMS = rows('menu_items')
export const DEMO_REVIEWS = rows('reviews')
export const DEMO_ORDERS = rows('orders')
export const DEMO_USER = first('users', {
  id: 'demo-user',
  full_name: 'Demo User',
  email: 'demo@example.com',
})

export const DEMO_DASHPASS_BENEFITS = [
  {
    id: 'dashpass-free-delivery',
    title: 'Free delivery on select orders',
    description: 'Enjoy lower fees on eligible stores with a DashPass-style membership.',
  },
  {
    id: 'dashpass-priority-support',
    title: 'Priority support',
    description: 'Surface a premium membership feel even before live backend data is connected.',
  },
  {
    id: 'dashpass-member-pricing',
    title: 'Member pricing callouts',
    description: 'Use badges and promos to highlight savings across the generated app.',
  },
]
"""


def normalize_route(route: str | None, fallback_name: str, is_first: bool = False) -> tuple[str, str]:
    raw = (route or "").strip()
    if not raw or raw == "/":
        normalized = "/"
    else:
        normalized = raw if raw.startswith("/") else f"/{raw}"
        normalized = re.sub(r":[a-zA-Z_][a-zA-Z0-9_]*", lambda m: f"[{m.group()[1:]}]", normalized)
        normalized = re.sub(r"[^a-zA-Z0-9/_\-\[\]]+", "-", normalized)
        normalized = re.sub(r"/+", "/", normalized).rstrip("/") or "/"

    if normalized == "/home":
        normalized = "/"
    if is_first and normalized == "/":
        file_path = "app/index.tsx"
    elif normalized == "/":
        file_path = "app/index.tsx"
    else:
        segments = normalized.lstrip("/").split("/")
        file_path = "app/" + "/".join(segments) + ".tsx"
    if file_path.endswith("/index.tsx"):
        return normalized, file_path
    return normalized, file_path


def route_key_for_file_path(file_path: str) -> str:
    if file_path == "app/index.tsx":
        return "home"
    slug = file_path.removeprefix("app/").removesuffix(".tsx")
    slug = slug.replace("/", "-").replace("[", "").replace("]", "")
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", slug).strip("-").lower()
    return slug or "screen"


def extract_route_params(route: str) -> list[str]:
    return re.findall(r"\[([^\]]+)\]", route)


def build_route_manifest(screen_analysis: list[dict]) -> list[dict]:
    manifest: list[dict] = []
    seen_paths: set[str] = set()
    for index, screen in enumerate(screen_analysis):
        route, file_path = normalize_route(screen.get("route"), screen.get("name", f"Screen {index + 1}"), is_first=index == 0)
        if file_path in seen_paths:
            continue
        seen_paths.add(file_path)
        manifest.append(
            {
                "name": screen.get("name", f"Screen {index + 1}"),
                "route": route,
                "purpose": screen.get("purpose", ""),
                "states": screen.get("states", []),
                "actions": screen.get("actions", []),
                "file_path": file_path,
                "route_key": route_key_for_file_path(file_path),
                "params": extract_route_params(route),
            }
        )
    if not manifest:
        manifest.append(
            {
                "name": "Home",
                "route": "/",
                "purpose": "Primary landing screen",
                "states": [],
                "actions": [],
                "file_path": "app/index.tsx",
                "route_key": "home",
                "params": [],
            }
        )
    return manifest


def build_fixed_mobile_files(app_name: str, reference_app: str, route_manifest: list[dict], schema: dict) -> dict[str, str]:
    dataset = generate_demo_rows(schema)
    return {
        "package.json": render_package_json(app_name),
        "app.json": render_app_json(app_name),
        "babel.config.js": render_babel_config(),
        "tsconfig.json": render_tsconfig(),
        "expo-env.d.ts": render_expo_env_types(),
        ".env.example": render_env_example(),
        "setup.sh": render_setup_sh(),
        "README.md": render_readme(app_name, reference_app, route_manifest, schema),
        "assets/.keep": "",
        "app/_layout.tsx": render_root_layout(),
        "app/+not-found.tsx": render_not_found(),
        "src/theme/tokens.ts": render_theme_tokens(),
        "src/theme/styles.ts": render_theme_styles(),
        "src/components/AppText.tsx": render_component_app_text(),
        "src/components/AppScreen.tsx": render_component_app_screen(),
        "src/components/SearchBar.tsx": render_component_search_bar(),
        "src/components/SectionHeader.tsx": render_component_section_header(),
        "src/components/SectionCard.tsx": render_component_section_card(),
        "src/components/BottomTabBar.tsx": render_component_bottom_tab_bar(),
        "src/components/FoodImage.tsx": render_component_food_image(),
        "src/components/ui.tsx": render_ui_components(),
        "src/lib/supabase.ts": render_supabase_client(),
        "src/lib/data.ts": render_data_helpers(),
        "src/lib/types.ts": render_typescript_types(schema),
        "src/lib/demo-data.ts": render_demo_data_file(dataset),
        "src/lib/fallback.ts": render_fallback_module(),
        "supabase/migrations/001_initial.sql": render_migration_sql(schema),
        "supabase/seed.sql": render_seed_sql(schema, dataset),
    }


def _validate_locked_manifest(base_files: dict[str, str]) -> None:
    missing = sorted(LOCKED_MOBILE_FILES - set(base_files))
    if missing:
        raise ValueError(f"Fixed mobile scaffold is missing locked files: {', '.join(missing)}")


def ensure_locked_mobile_files(files: dict[str, str], base_files: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    _validate_locked_manifest(base_files)
    merged = dict(files)
    restored: list[str] = []
    for path in sorted(LOCKED_MOBILE_FILES):
        if path not in merged:
            merged[path] = base_files[path]
            restored.append(path)
    return merged, restored


def _extract_export_interface_blocks(source: str) -> list[str]:
    return [
        block.strip()
        for block in re.findall(
            r"(export interface\s+\w+[^{]*\{(?:[^{}]|\{[^{}]*\})*?\})",
            source,
            flags=re.DOTALL,
        )
    ]


def _extract_export_type_blocks(source: str) -> list[str]:
    return [
        block.strip()
        for block in re.findall(
            r"(export type\s+\w+[^{=]*=\s*\{(?:[^{}]|\{[^{}]*\})*?\})",
            source,
            flags=re.DOTALL,
        )
    ]


def _extract_function_signatures(source: str) -> list[str]:
    return [
        match.strip()
        for match in re.findall(
            r"(export\s+(?:async\s+)?function\s+\w+[^{]+)",
            source,
        )
    ]


def extract_scaffold_api(base_files: dict[str, str], route_manifest: list[dict] | None = None) -> str:
    _validate_locked_manifest(base_files)
    component_sections: list[str] = []
    for path in sorted(path for path in LOCKED_MOBILE_FILES if path.startswith("src/components/")):
        source = base_files.get(path, "")
        exports = _extract_export_interface_blocks(source)
        if not exports:
            continue
        component_sections.append(f"// {path}\n" + "\n\n".join(exports))

    data_source = base_files.get("src/lib/data.ts", "")
    helper_blocks = _extract_export_type_blocks(data_source) + _extract_function_signatures(data_source)

    token_exports = [
        match
        for match in re.findall(r"export const (\w+)\s*=", base_files.get("src/theme/tokens.ts", ""))
        if match != "tokens"
    ]

    route_lines: list[str] = []
    for route in route_manifest or []:
        params = ", ".join(route.get("params") or []) or "none"
        route_lines.append(
            f"- route `{route['route']}` -> file `{route['file_path']}` params: {params}"
        )

    sections = [
        "### Shared Components",
        "\n\n".join(component_sections) or "// No shared component interfaces found",
        "### Data Helpers",
        "\n\n".join(helper_blocks) or "// No data helper exports found",
        "### Theme Tokens",
        "\n".join(f"- {name}" for name in token_exports) or "- Colors\n- Spacing\n- Radii\n- FontSize\n- FontWeight",
        "### Routes",
        "\n".join(route_lines) or "- route `/` -> file `app/index.tsx` params: none",
    ]
    return "\n\n".join(sections).strip()


def extract_design_tokens(frontend_spec: str) -> str:
    marker = "\n## DESIGN TOKENS\n"
    if marker not in frontend_spec:
        return ""
    return frontend_spec.split(marker, 1)[1].strip()


def _extract_import_paths(source: str) -> list[str]:
    return re.findall(r"(?:import|export)\s+(?:type\s+)?(?:[^'\"]+?\s+from\s+)?['\"]([^'\"]+)['\"]", source)


def _normalize_import_path(importer_path: str, import_path: str) -> str | None:
    if not import_path.startswith((".", "@/")):
        return None
    if import_path.startswith("@/"):
        return import_path.removeprefix("@/")
    parts = []
    for segment in (Path(importer_path).parent / import_path).parts:
        if segment in {"", "."}:
            continue
        if segment == "..":
            if parts:
                parts.pop()
            continue
        parts.append(segment)
    if "app" in parts:
        start = parts.index("app")
        return "/".join(parts[start:])
    if "src" in parts:
        start = parts.index("src")
        return "/".join(parts[start:])
    return None


def _feature_root(route_entry: dict) -> str:
    return f"src/features/{route_entry['route_key']}/"


def prevalidate_mobile_project(files: dict[str, str], route_manifest: list[dict], base_files: dict[str, str]) -> dict:
    ensured_files, restored = ensure_locked_mobile_files(files, base_files)
    errors: list[str] = []
    failing_files: list[str] = []

    locked_component_files = {
        path
        for path in LOCKED_MOBILE_FILES
        if path.startswith("src/components/") and path.endswith((".ts", ".tsx"))
    }
    route_entries_by_path = {route["file_path"]: route for route in route_manifest}

    for route_file, route_entry in route_entries_by_path.items():
        source = ensured_files.get(route_file)
        if not source:
            errors.append(f"{route_file}: missing generated route file")
            failing_files.append(route_file)
            continue

        import_paths = _extract_import_paths(source)
        if not any("src/lib/view-models" in path for path in import_paths):
            errors.append(f"{route_file}: route files must import loaders or types from src/lib/view-models.ts")
            failing_files.append(route_file)

        for import_path in import_paths:
            normalized = _normalize_import_path(route_file, import_path)
            if normalized is None:
                continue
            if normalized.startswith("src/lib/types"):
                errors.append(f"{route_file}: route files may not import raw src/lib/types.ts")
                failing_files.append(route_file)
            if normalized.startswith("src/lib/data"):
                errors.append(f"{route_file}: route files may not import src/lib/data.ts directly; use src/lib/view-models.ts")
                failing_files.append(route_file)
            if normalized.startswith("src/components/") and normalized not in locked_component_files:
                errors.append(f"{route_file}: imported non-scaffold component {normalized}")
                failing_files.append(route_file)
            if normalized.startswith("src/features/") and not normalized.startswith(_feature_root(route_entry)):
                errors.append(
                    f"{route_file}: route files may only import feature files from {_feature_root(route_entry)}"
                )
                failing_files.append(route_file)

    if "src/lib/view-models.ts" not in ensured_files:
        errors.append("src/lib/view-models.ts: missing generated view-model contract")
        failing_files.append("src/lib/view-models.ts")

    deduped_files: list[str] = []
    for path in failing_files:
        if path not in deduped_files:
            deduped_files.append(path)
    return {
        "ok": not errors,
        "errors": "\n".join(errors),
        "failing_files": deduped_files,
        "files": ensured_files,
        "restored_files": restored,
    }


def write_project_files(root_dir: Path, files: dict[str, str]) -> None:
    for relative_path, content in files.items():
        full_path = root_dir / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        if relative_path == "setup.sh":
            full_path.chmod(0o755)


def validate_sql_text(sql: str) -> list[str]:
    errors: list[str] = []
    if parse_sql:
        try:
            parse_sql(sql)
        except Exception as exc:  # pragma: no cover - parser library handles this
            errors.append(str(exc))
    if sql.count("(") != sql.count(")"):
        errors.append("SQL contains mismatched parentheses.")
    return errors


def validate_sql_files(files: dict[str, str]) -> list[str]:
    errors: list[str] = []
    migration = files.get("supabase/migrations/001_initial.sql", "")
    seed = files.get("supabase/seed.sql", "")
    errors.extend(f"migration: {err}" for err in validate_sql_text(migration))
    errors.extend(f"seed: {err}" for err in validate_sql_text(seed))

    declared_tables = set(re.findall(r"create table if not exists public\.([a-z0-9_]+)", migration, flags=re.I))
    seeded_tables = set(re.findall(r"insert into public\.([a-z0-9_]+)", seed, flags=re.I))
    missing = sorted(seeded_tables - declared_tables)
    if missing:
        errors.append(f"seed references undeclared tables: {', '.join(missing)}")
    return errors


def _run_command(cmd: list[str], cwd: Path, timeout: int = 600) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        partial = (exc.stdout or "") + ("\n" + exc.stderr if exc.stderr else "")
        return False, f"command timed out after {timeout}s\n{partial.strip()}".strip()
    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    return result.returncode == 0, output.strip()


def infer_failing_files(log_output: str) -> list[str]:
    file_paths = re.findall(r"([A-Za-z0-9_./+-]+\.(?:tsx|ts|js|json))", log_output)
    unique = []
    for path in file_paths:
        clean = path.lstrip("./")
        if clean not in unique:
            unique.append(clean)
    return unique


def validate_mobile_project(
    app_name: str,
    files: dict[str, str],
    *,
    route_manifest: list[dict] | None = None,
    base_files: dict[str, str] | None = None,
) -> dict:
    if route_manifest is not None and base_files is not None:
        prevalidation = prevalidate_mobile_project(files, route_manifest, base_files)
        files = prevalidation["files"]
        if not prevalidation["ok"]:
            return {
                "ok": False,
                "errors": prevalidation["errors"],
                "failing_files": prevalidation["failing_files"],
            }

    sql_errors = validate_sql_files(files)
    if sql_errors:
        return {
            "ok": False,
            "errors": "\n".join(sql_errors),
            "failing_files": ["supabase/migrations/001_initial.sql", "supabase/seed.sql"],
        }

    slug = slugify_name(app_name)
    temp_root = Path(tempfile.mkdtemp(prefix=f"{slug}_"))
    project_root = temp_root / slug
    project_root.mkdir(parents=True, exist_ok=True)
    try:
        write_project_files(project_root, files)
        steps = [
            ("npm install", ["npm", "install", "--no-fund", "--no-audit"]),
            ("expo config", ["npx", "expo", "config", "--json"]),
            ("typecheck", ["npx", "tsc", "--noEmit"]),
            ("expo export", ["npx", "expo", "export", "--platform", "ios", "--platform", "android", "--output-dir", "dist-mobile"]),
        ]
        for label, cmd in steps:
            ok, output = _run_command(cmd, cwd=project_root, timeout=900 if label == "npm install" else 600)
            if not ok:
                return {
                    "ok": False,
                    "errors": f"{label} failed\n{output}",
                    "failing_files": infer_failing_files(output),
                }
        return {"ok": True, "errors": "", "failing_files": []}
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def merge_files(base_files: dict[str, str], generated_files: dict[str, str]) -> dict[str, str]:
    merged = dict(base_files)
    for path, content in generated_files.items():
        if path in LOCKED_MOBILE_FILES:
            continue
        merged[path] = content
    return merged


def render_repair_notes(errors: list[str]) -> str:
    lines = ["# Repair Notes", ""]
    for index, error in enumerate(errors, start=1):
        lines.append(f"## Attempt {index}")
        lines.append("")
        lines.append("```text")
        lines.append(error.strip())
        lines.append("```")
        lines.append("")
    return "\n".join(lines).strip() + "\n"
