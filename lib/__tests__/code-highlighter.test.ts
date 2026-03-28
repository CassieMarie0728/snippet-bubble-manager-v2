import { describe, it, expect } from "vitest";

// We test the tokenizer logic directly by extracting it.
// Since the component file uses React, we'll replicate the pure tokenizer here for testing.

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "this", "class", "extends", "import",
  "export", "default", "from", "async", "await", "try", "catch", "finally", "throw",
  "typeof", "instanceof", "in", "of", "yield", "void", "delete", "true", "false",
  "null", "undefined", "interface", "type", "enum", "implements", "abstract",
  "def", "lambda", "pass", "with", "as", "is", "not", "and", "or", "None",
  "True", "False", "print", "self", "elif", "except", "raise", "global", "nonlocal",
  "fun", "val", "var", "when", "object", "companion", "data", "sealed", "override",
  "private", "public", "protected", "internal", "static", "final", "super",
  "struct", "guard", "protocol", "extension", "where",
  "fn", "pub", "mod", "use", "impl", "trait", "match", "mut", "ref", "move",
  "go", "func", "package", "defer", "chan", "select", "range",
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "JOIN", "ON", "AND", "OR",
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "AS", "DISTINCT",
  "NOT", "NULL", "PRIMARY", "KEY", "FOREIGN", "INDEX", "UNIQUE",
  "echo", "exit", "fi", "then", "done",
]);

const TYPE_WORDS = new Set([
  "string", "number", "boolean", "any", "void", "never", "unknown", "object",
  "int", "float", "double", "long", "short", "byte", "char", "bool",
  "String", "Int", "Float", "Double", "Long", "Boolean", "Array", "List",
  "Map", "Set", "Promise", "Observable", "Result", "Option", "Vec",
]);

interface Token {
  type: "keyword" | "string" | "comment" | "number" | "punctuation" | "function" | "type" | "plain";
  value: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
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

    if (code[i] === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (code[i] === "-" && code[i + 1] === "-" && (i === 0 || code[i - 1] === "\n" || code[i - 1] === " ")) {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: "string", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s,;:=({[\-+*/]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxX._]/.test(code[j])) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

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

    if (/[{}()\[\];:.,<>=!&|?+\-*/%^~@\\]/.test(code[i])) {
      tokens.push({ type: "punctuation", value: code[i] });
      i++;
      continue;
    }

    let j = i;
    while (j < code.length && !/[a-zA-Z0-9_$"'`{}()\[\];:.,<>=!&|?+\-*/%^~@\\#/]/.test(code[j])) {
      j++;
    }
    if (j === i) j = i + 1;
    tokens.push({ type: "plain", value: code.slice(i, j) });
    i = j;
  }

  return tokens;
}

describe("CodeHighlighter Tokenizer", () => {
  it("tokenizes JavaScript keywords", () => {
    const tokens = tokenize("const x = 42;");
    expect(tokens[0]).toEqual({ type: "keyword", value: "const" });
    const numToken = tokens.find((t) => t.type === "number");
    expect(numToken).toBeDefined();
    expect(numToken!.value).toBe("42");
  });

  it("tokenizes strings with double quotes", () => {
    const tokens = tokenize('const msg = "hello world";');
    const strToken = tokens.find((t) => t.type === "string");
    expect(strToken).toBeDefined();
    expect(strToken!.value).toBe('"hello world"');
  });

  it("tokenizes single-line comments", () => {
    const tokens = tokenize("// this is a comment\nconst x = 1;");
    expect(tokens[0]).toEqual({ type: "comment", value: "// this is a comment" });
  });

  it("tokenizes multi-line comments", () => {
    const tokens = tokenize("/* block\ncomment */\nconst x = 1;");
    expect(tokens[0]).toEqual({ type: "comment", value: "/* block\ncomment */" });
  });

  it("tokenizes function calls", () => {
    const tokens = tokenize("console.log('hi')");
    const funcToken = tokens.find((t) => t.type === "function");
    expect(funcToken).toBeDefined();
    expect(funcToken!.value).toBe("log");
  });

  it("tokenizes Python keywords", () => {
    const tokens = tokenize("def hello():\n    print('hi')");
    expect(tokens[0]).toEqual({ type: "keyword", value: "def" });
    const printToken = tokens.find((t) => t.value === "print");
    expect(printToken).toBeDefined();
    expect(printToken!.type).toBe("keyword");
  });

  it("tokenizes type words", () => {
    const tokens = tokenize("let x: string = 'hello';");
    const typeToken = tokens.find((t) => t.type === "type");
    expect(typeToken).toBeDefined();
    expect(typeToken!.value).toBe("string");
  });

  it("tokenizes SQL keywords", () => {
    const tokens = tokenize("SELECT * FROM users WHERE id = 1;");
    expect(tokens[0]).toEqual({ type: "keyword", value: "SELECT" });
    const fromToken = tokens.find((t) => t.value === "FROM");
    expect(fromToken).toBeDefined();
    expect(fromToken!.type).toBe("keyword");
  });

  it("tokenizes punctuation", () => {
    const tokens = tokenize("{}()[];");
    expect(tokens.every((t) => t.type === "punctuation")).toBe(true);
    expect(tokens).toHaveLength(7);
  });

  it("handles escaped strings", () => {
    const tokens = tokenize('const s = "hello\\"world";');
    const strToken = tokens.find((t) => t.type === "string");
    expect(strToken).toBeDefined();
    expect(strToken!.value).toBe('"hello\\"world"');
  });

  it("handles empty input", () => {
    const tokens = tokenize("");
    expect(tokens).toHaveLength(0);
  });

  it("handles template literals", () => {
    const tokens = tokenize("const s = `hello ${name}`;");
    const strToken = tokens.find((t) => t.type === "string");
    expect(strToken).toBeDefined();
  });

  it("handles hash comments for Python/shell", () => {
    const tokens = tokenize("# this is a comment\nx = 1");
    expect(tokens[0]).toEqual({ type: "comment", value: "# this is a comment" });
  });
});
