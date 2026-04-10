/**
 * Code Formatter Service
 * Handles formatting of code snippets using language-specific formatters.
 * On mobile, we use simplified formatting rules. On web, we can integrate with actual formatters.
 */

import { getLanguageConfig } from "./languages";

export interface FormattingOptions {
  indentSize?: number;
  useTabs?: boolean;
  lineWidth?: number;
  trailingComma?: "es5" | "none" | "all";
  semi?: boolean;
  singleQuote?: boolean;
}

const DEFAULT_OPTIONS: FormattingOptions = {
  indentSize: 2,
  useTabs: false,
  lineWidth: 80,
  trailingComma: "es5",
  semi: true,
  singleQuote: false,
};

/**
 * Format code based on language
 */
export async function formatCode(
  code: string,
  language: string,
  options: FormattingOptions = DEFAULT_OPTIONS
): Promise<string> {
  const langConfig = getLanguageConfig(language);
  if (!langConfig) return code;

  switch (langConfig.formatter) {
    case "prettier":
      return formatWithPrettier(code, language, options);
    case "black":
      return formatWithBlack(code, options);
    case "gofmt":
      return formatWithGofmt(code, options);
    case "rustfmt":
      return formatWithRustfmt(code, options);
    case "shfmt":
      return formatWithShfmt(code, options);
    case "sqlformat":
      return formatWithSqlformat(code, options);
    default:
      return formatBasic(code, options);
  }
}

/**
 * Basic formatting: normalize indentation and line endings
 */
function formatBasic(code: string, options: FormattingOptions): string {
  const indent = options.useTabs ? "\t" : " ".repeat(options.indentSize || 2);
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Normalize indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();

    // Decrease indent for closing braces
    if (trimmed.match(/^[}\]]/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const formatted = indentLevel > 0 ? indent.repeat(indentLevel) + trimmed : trimmed;

    // Increase indent for opening braces
    if (trimmed.match(/[{[]$/)) {
      indentLevel++;
    }

    return formatted;
  });

  return formatted.join("\n");
}

/**
 * Prettier formatting (for JS/TS/HTML/CSS/JSON)
 */
function formatWithPrettier(
  code: string,
  language: string,
  options: FormattingOptions
): string {
  // On mobile, we do simplified Prettier-like formatting
  // In production, this would call the actual Prettier library

  const indent = options.useTabs ? "\t" : " ".repeat(options.indentSize || 2);
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Add space after keywords
  result = result.replace(/\b(if|else|for|while|switch|catch|function)\(/g, "$1 (");

  // Add space around operators (but not in strings)
  result = result.replace(/([^=!<>+\-*/%&|^])(=|==|===|!=|!==|<=|>=|<|>)([^=])/g, "$1 $2 $3");

  // Normalize indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Decrease indent for closing braces
    if (trimmed.match(/^[}\]]/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const formatted = indentLevel > 0 ? indent.repeat(indentLevel) + trimmed : trimmed;

    // Increase indent for opening braces
    if (trimmed.match(/[{[]$/)) {
      indentLevel++;
    }

    return formatted;
  });

  return formatted.join("\n");
}

/**
 * Black formatting (for Python)
 */
function formatWithBlack(code: string, options: FormattingOptions): string {
  const indent = options.useTabs ? "\t" : " ".repeat(options.indentSize || 4);
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Black uses 4-space indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Decrease indent for dedents (lines that start at column 0 or less indented)
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    if (leadingSpaces === 0 && indentLevel > 0) {
      indentLevel = 0;
    }

    // Add space around operators
    let formatted = trimmed;
    formatted = formatted.replace(/([^=!<>+\-*/%&|^:])(=|==|!=|<=|>=|<|>)([^=])/g, "$1 $2 $3");

    // Increase indent for colons
    if (trimmed.endsWith(":")) {
      const result = indent.repeat(indentLevel) + formatted;
      indentLevel++;
      return result;
    }

    // Decrease indent if line doesn't continue from colon
    if (indentLevel > 0 && !line.startsWith(indent)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    return indent.repeat(indentLevel) + formatted;
  });

  return formatted.join("\n");
}

/**
 * Go formatting (gofmt style)
 */
function formatWithGofmt(code: string, options: FormattingOptions): string {
  const indent = "\t"; // Go uses tabs
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Add space around operators
  result = result.replace(/([^=!<>+\-*/%&|^:])(=|==|!=|<=|>=|<|>)([^=])/g, "$1 $2 $3");

  // Normalize indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Decrease indent for closing braces
    if (trimmed.match(/^[}]/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const formatted = indentLevel > 0 ? indent.repeat(indentLevel) + trimmed : trimmed;

    // Increase indent for opening braces
    if (trimmed.match(/[{]$/)) {
      indentLevel++;
    }

    return formatted;
  });

  return formatted.join("\n");
}

/**
 * Rust formatting (rustfmt style)
 */
function formatWithRustfmt(code: string, options: FormattingOptions): string {
  const indent = " ".repeat(4); // Rust uses 4 spaces
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Add space around operators
  result = result.replace(/([^=!<>+\-*/%&|^:])(=|==|!=|<=|>=|<|>)([^=])/g, "$1 $2 $3");

  // Normalize indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Decrease indent for closing braces
    if (trimmed.match(/^[}]/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const formatted = indentLevel > 0 ? indent.repeat(indentLevel) + trimmed : trimmed;

    // Increase indent for opening braces
    if (trimmed.match(/[{]$/)) {
      indentLevel++;
    }

    return formatted;
  });

  return formatted.join("\n");
}

/**
 * Shell formatting (shfmt style)
 */
function formatWithShfmt(code: string, options: FormattingOptions): string {
  const indent = " ".repeat(4);
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Normalize indentation
  const lines = result.split("\n");
  let indentLevel = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Decrease indent for 'done', 'fi', 'esac'
    if (trimmed.match(/^(done|fi|esac)/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const formatted = indentLevel > 0 ? indent.repeat(indentLevel) + trimmed : trimmed;

    // Increase indent for 'do', 'then', 'case'
    if (trimmed.match(/(do|then|case)$/)) {
      indentLevel++;
    }

    return formatted;
  });

  return formatted.join("\n");
}

/**
 * SQL formatting (sqlformat style)
 */
function formatWithSqlformat(code: string, options: FormattingOptions): string {
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n");

  // Uppercase SQL keywords
  const keywords = [
    "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "TABLE", "ALTER", "DROP", "JOIN", "LEFT", "RIGHT", "INNER", "ON", "AND",
    "OR", "NOT", "IN", "BETWEEN", "LIKE", "IS", "NULL", "GROUP", "BY", "HAVING",
    "ORDER", "ASC", "DESC", "LIMIT", "OFFSET", "DISTINCT", "UNION",
  ];

  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    result = result.replace(regex, keyword);
  });

  // Add newlines after major keywords
  result = result.replace(/\s+(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT)/gi, "\n$1");

  // Normalize indentation
  const lines = result.split("\n");
  const formatted = lines.map((line) => line.trim()).filter((line) => line);

  return formatted.join("\n");
}

/**
 * Detect if code needs formatting
 */
export function needsFormatting(code: string): boolean {
  // Check for common formatting issues
  const issues = [
    /\n\s{0,1}\n/, // Multiple blank lines
    /\t/, // Inconsistent tabs
    /\s+$/, // Trailing whitespace
    /[{(]\s*\n/, // Opening brace on same line
    /\s{3,}/, // Multiple spaces (not in strings)
  ];

  return issues.some((issue) => issue.test(code));
}
