---
name: arcana-i18n-consistency
description: Use when changing Arcana Insight UI copy, translation keys, locale-specific content, or multilingual product wording. Enforces key reuse, en/uk parity, mobile-readable phrasing, and no hardcoded strings in i18n-driven flows.
---

# Arcana i18n Consistency

Use this skill for any text change that touches localization.

## Source Files

- English locale: `src/i18n/en.json`
- Ukrainian locale: `src/i18n/uk.json`
- i18n entrypoint: `src/boot/i18n.js`
- bundled messages: `src/i18n/messages.bundle.js`

## Rules

1. Reuse before adding.
   Search for an existing key before creating a new one.

2. Keep locale parity.
   If a user-facing string changes, update both `en` and `uk` unless the task explicitly says otherwise.

3. Do not hardcode UI strings in an i18n-driven screen.

4. In Vue templates, use translation keys in markup instead of inline locale checks or per-language ternaries.

5. Keep mobile phrasing concise.
   Translation length must still fit mobile layouts and buttons.

6. Preserve product tone across locales.
   Ukrainian and English should express the same product meaning, not different concepts.

## Workflow

1. Find the current key usage.
2. Check whether an existing key already covers the wording.
3. If a new key is necessary, add it in both locale files with matching meaning.
4. Verify the changed keys resolve where used.
5. Re-check the screen for text overflow risk.

## Red Flags

- hardcoded English in a translated screen
- near-duplicate translation keys
- English and Ukrainian drifting in meaning
- long copy added to compact mobile surfaces

## Completion Check

- all touched strings exist in both locales
- no duplicate low-value key was introduced
- wording still fits mobile UI
- product tone remains aligned across languages
