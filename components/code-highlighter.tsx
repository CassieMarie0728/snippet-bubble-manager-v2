import { useMemo } from "react";
import { View, Text, ScrollView, Platform, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Lightweight syntax highlighter for React Native.
 *
 * Uses a simple regex-based tokenizer that works cross-platform without
 * depending on DOM APIs. Covers keywords, strings, comments, numbers,
 * and punctuation for most C-family and scripting languages.
 */

interface CodeHighlighterProps {
  code: string;
  language?: string;
  maxLines?: number;
  fontSize?: number;
  showLineNumbers?: boolean;
}

interface Token {
  type: "keyword" | "string" | "comment" | "number" | "punctuation" | "function" | "type" | "plain";
  value: string;
}

// Common keywords across popular languages
const KEYWORDS = new Set([
  // JS/TS
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "this", "class", "extends", "import",
  "export", "default", "from", "async", "await", "try", "catch", "finally", "throw",
  "typeof", "instanceof", "in", "of", "yield", "void", "delete", "true", "false",
  "null", "undefined", "interface", "type", "enum", "implements", "abstract",
  // Python
  "def", "lambda", "pass", "with", "as", "is", "not", "and", "or", "None",
  "True", "False", "print", "self", "elif", "except", "raise", "global", "nonlocal",
  // Kotlin / Java / Swift
  "fun", "val", "var", "when", "object", "companion", "data", "sealed", "override",
  "private", "public", "protected", "internal", "static", "final", "super",
  "struct", "guard", "protocol", "extension", "where",
  // Rust / Go
  "fn", "pub", "mod", "use", "impl", "trait", "match", "mut", "ref", "move",
  "go", "func", "package", "defer", "chan", "select", "range",
  // SQL
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "JOIN", "ON", "AND", "OR",
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "AS", "DISTINCT",
  "NOT", "NULL", "PRIMARY", "KEY", "FOREIGN", "INDEX", "UNIQUE",
  // Shell
  "echo", "exit", "fi", "then", "done",
]);

const TYPE_WORDS = new Set([
  "string", "number", "boolean", "any", "void", "never", "unknown", "object",
  "int", "float", "double", "long", "short", "byte", "char", "bool",
  "String", "Int", "Float", "Double", "Long", "Boolean", "Array", "List",
  "Map", "Set", "Promise", "Observable", "Result", "Option", "Vec",
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-line comment: // or #
    if (
      (code[i] === "/" && code[i + 1] === "/") ||
      (code[i] === "#" && (i === 0 || code[i - 1] === "\n" || code[i - 1] === " "))
    ) {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Multi-line comment: /* ... */
    if (code[i] === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // SQL single-line comment: --
    if (code[i] === "-" && code[i + 1] === "-" && (i === 0 || code[i - 1] === "\n" || code[i - 1] === " ")) {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Strings: "...", '...', `...`
    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++; // skip escaped char
        j++;
      }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: "string", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s,;:=({[\-+*/]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxX._]/.test(code[j])) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$@]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (TYPE_WORDS.has(word)) {
        tokens.push({ type: "type", value: word });
      } else if (j < code.length && code[j] === "(") {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }

    // Punctuation
    if (/[{}()\[\];:.,<>=!&|?+\-*/%^~@\\]/.test(code[i])) {
      tokens.push({ type: "punctuation", value: code[i] });
      i++;
      continue;
    }

    // Whitespace and other characters
    let j = i;
    while (j < code.length && !/[a-zA-Z0-9_$"'`{}()\[\];:.,<>=!&|?+\-*/%^~@\\#/]/.test(code[j])) {
      j++;
    }
    if (j === i) j = i + 1; // safety: always advance
    tokens.push({ type: "plain", value: code.slice(i, j) });
    i = j;
  }

  return tokens;
}

// Dark theme color palette (matches our crimson dark theme)
const TOKEN_COLORS_DARK: Record<Token["type"], string> = {
  keyword: "#c41e22",    // crimson primary
  string: "#4ADE80",     // green
  comment: "#6b7280",    // gray
  number: "#FBBF24",     // amber
  punctuation: "#9BA1A6", // muted
  function: "#60a5fa",   // blue
  type: "#c084fc",       // purple
  plain: "#ECEDEE",      // foreground
};

const TOKEN_COLORS_LIGHT: Record<Token["type"], string> = {
  keyword: "#981518",    // crimson primary
  string: "#16a34a",     // green
  comment: "#9ca3af",    // gray
  number: "#d97706",     // amber
  punctuation: "#687076", // muted
  function: "#2563eb",   // blue
  type: "#9333ea",       // purple
  plain: "#11181C",      // foreground
};

export function CodeHighlighter({
  code,
  language,
  maxLines,
  fontSize = 13,
  showLineNumbers = false,
}: CodeHighlighterProps) {
  const colors = useColors();
  const isDark = colors.background === "#0b0f0f" || colors.background.toLowerCase().startsWith("#0") || colors.background.toLowerCase().startsWith("#1");
  const tokenColors = isDark ? TOKEN_COLORS_DARK : TOKEN_COLORS_LIGHT;

  const displayCode = useMemo(() => {
    if (maxLines) {
      const lines = code.split("\n");
      if (lines.length > maxLines) {
        return lines.slice(0, maxLines).join("\n");
      }
    }
    return code;
  }, [code, maxLines]);

  const tokens = useMemo(() => tokenize(displayCode), [displayCode]);

  const lineCount = useMemo(() => displayCode.split("\n").length, [displayCode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.codeRow}>
          {showLineNumbers && (
            <View style={styles.lineNumbers}>
              {Array.from({ length: lineCount }, (_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.lineNumber,
                    {
                      color: colors.muted,
                      fontSize,
                      lineHeight: fontSize * 1.6,
                      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    },
                  ]}
                >
                  {i + 1}
                </Text>
              ))}
            </View>
          )}
          <Text
            style={[
              styles.codeText,
              {
                fontSize,
                lineHeight: fontSize * 1.6,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              },
            ]}
            selectable
          >
            {tokens.map((token, idx) => (
              <Text key={idx} style={{ color: tokenColors[token.type] }}>
                {token.value}
              </Text>
            ))}
            {maxLines && code.split("\n").length > maxLines && (
              <Text style={{ color: colors.muted }}>{"\n..."}</Text>
            )}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
  },
  codeRow: {
    flexDirection: "row",
    padding: 10,
  },
  lineNumbers: {
    marginRight: 12,
    alignItems: "flex-end",
    opacity: 0.5,
  },
  lineNumber: {
    textAlign: "right",
    minWidth: 20,
  },
  codeText: {
    flex: 1,
  },
});
