/**
 * Snippet Templates Service
 * Pre-populated common patterns and boilerplate code across all supported languages
 */

import type { SnippetInput } from "./types";

export interface SnippetTemplate {
  templateId: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  category: "web" | "backend" | "database" | "devops" | "utility" | "script";
  difficulty: "beginner" | "intermediate" | "advanced";
}

const TEMPLATES: SnippetTemplate[] = [
  // JavaScript/TypeScript
  {
    templateId: "js_hello_world",
    title: "Hello World - JavaScript",
    code: `console.log("Hello, World!");`,
    language: "JavaScript",
    description: "Classic Hello World in JavaScript",
    tags: ["beginner", "hello-world"],
    category: "web",
    difficulty: "beginner",
  },
  {
    templateId: "js_fetch_api",
    title: "Fetch API Request",
    code: `fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    language: "JavaScript",
    description: "Basic fetch API call with error handling",
    tags: ["api", "async", "fetch"],
    category: "web",
    difficulty: "intermediate",
  },
  {
    templateId: "ts_interface",
    title: "TypeScript Interface",
    code: `interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  isActive: true,
};`,
    language: "TypeScript",
    description: "Define and use a TypeScript interface",
    tags: ["types", "interface"],
    category: "web",
    difficulty: "beginner",
  },
  {
    templateId: "react_hook",
    title: "React useState Hook",
    code: `import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
    language: "JavaScript",
    description: "React component using useState hook",
    tags: ["react", "hooks", "state"],
    category: "web",
    difficulty: "intermediate",
  },

  // Python
  {
    templateId: "python_hello_world",
    title: "Hello World - Python",
    code: `print("Hello, World!")`,
    language: "Python",
    description: "Classic Hello World in Python",
    tags: ["beginner", "hello-world"],
    category: "script",
    difficulty: "beginner",
  },
  {
    templateId: "python_function",
    title: "Python Function",
    code: `def greet(name: str) -> str:
    """Greet a person by name."""
    return f"Hello, {name}!"

result = greet("Alice")
print(result)`,
    language: "Python",
    description: "Define and call a Python function with type hints",
    tags: ["function", "types"],
    category: "script",
    difficulty: "beginner",
  },
  {
    templateId: "python_list_comprehension",
    title: "Python List Comprehension",
    code: `numbers = [1, 2, 3, 4, 5]
squared = [x ** 2 for x in numbers]
print(squared)  # [1, 4, 9, 16, 25]

# With condition
evens = [x for x in numbers if x % 2 == 0]
print(evens)  # [2, 4]`,
    language: "Python",
    description: "Python list comprehension examples",
    tags: ["list", "comprehension"],
    category: "script",
    difficulty: "intermediate",
  },
  {
    templateId: "python_decorator",
    title: "Python Decorator",
    code: `def timing_decorator(func):
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"Execution time: {end - start:.4f}s")
        return result
    return wrapper

@timing_decorator
def slow_function():
    import time
    time.sleep(1)

slow_function()`,
    language: "Python",
    description: "Create and use a Python decorator",
    tags: ["decorator", "function"],
    category: "utility",
    difficulty: "advanced",
  },

  // SQL
  {
    templateId: "sql_select_basic",
    title: "SQL SELECT Statement",
    code: `SELECT id, name, email, created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;`,
    language: "SQL",
    description: "Basic SQL SELECT query",
    tags: ["select", "query"],
    category: "database",
    difficulty: "beginner",
  },
  {
    templateId: "sql_join",
    title: "SQL JOIN Query",
    code: `SELECT u.id, u.name, o.order_id, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
ORDER BY o.created_at DESC;`,
    language: "SQL",
    description: "SQL query with JOIN operation",
    tags: ["join", "query"],
    category: "database",
    difficulty: "intermediate",
  },
  {
    templateId: "sql_aggregate",
    title: "SQL Aggregate Functions",
    code: `SELECT 
  category,
  COUNT(*) as total_items,
  AVG(price) as avg_price,
  MAX(price) as max_price,
  MIN(price) as min_price
FROM products
GROUP BY category
HAVING COUNT(*) > 5
ORDER BY total_items DESC;`,
    language: "SQL",
    description: "SQL aggregate functions with GROUP BY",
    tags: ["aggregate", "group-by"],
    category: "database",
    difficulty: "intermediate",
  },

  // Go
  {
    templateId: "go_hello_world",
    title: "Hello World - Go",
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    language: "Go",
    description: "Classic Hello World in Go",
    tags: ["beginner", "hello-world"],
    category: "backend",
    difficulty: "beginner",
  },
  {
    templateId: "go_http_server",
    title: "Go HTTP Server",
    code: `package main

import (
    "fmt"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}`,
    language: "Go",
    description: "Simple HTTP server in Go",
    tags: ["http", "server"],
    category: "backend",
    difficulty: "intermediate",
  },

  // Rust
  {
    templateId: "rust_hello_world",
    title: "Hello World - Rust",
    code: `fn main() {
    println!("Hello, World!");
}`,
    language: "Rust",
    description: "Classic Hello World in Rust",
    tags: ["beginner", "hello-world"],
    category: "backend",
    difficulty: "beginner",
  },
  {
    templateId: "rust_function",
    title: "Rust Function",
    code: `fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let result = add(5, 3);
    println!("Result: {}", result);
}`,
    language: "Rust",
    description: "Define and call a Rust function",
    tags: ["function"],
    category: "backend",
    difficulty: "beginner",
  },

  // Bash
  {
    templateId: "bash_hello_world",
    title: "Hello World - Bash",
    code: `#!/bin/bash
echo "Hello, World!"`,
    language: "Bash",
    description: "Classic Hello World in Bash",
    tags: ["beginner", "hello-world"],
    category: "script",
    difficulty: "beginner",
  },
  {
    templateId: "bash_loop",
    title: "Bash For Loop",
    code: `#!/bin/bash\n\nfor i in {1..5}; do\n    echo "Iteration $i"\ndone\n\n# Or with array\nfiles=("file1.txt" "file2.txt" "file3.txt")\nfor file in "\${files[@]}"; do\n    echo "Processing: $file"\ndone`,
    language: "Bash",
    description: "Bash for loop examples",
    tags: ["loop", "script"],
    category: "script",
    difficulty: "beginner",
  },

  // Docker
  {
    templateId: "docker_basic",
    title: "Basic Dockerfile",
    code: `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]`,
    language: "Dockerfile",
    description: "Basic Node.js Dockerfile",
    tags: ["docker", "container"],
    category: "devops",
    difficulty: "intermediate",
  },

  // JSON
  {
    templateId: "json_config",
    title: "JSON Configuration",
    code: `{
  "name": "my-app",
  "version": "1.0.0",
  "description": "My awesome application",
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "react": "^18.0.0",
    "express": "^4.18.0"
  }
}`,
    language: "JSON",
    description: "Example JSON configuration file",
    tags: ["config", "json"],
    category: "utility",
    difficulty: "beginner",
  },

  // HTML
  {
    templateId: "html_basic",
    title: "Basic HTML Page",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
</head>
<body>
    <h1>Welcome</h1>
    <p>Hello, World!</p>
</body>
</html>`,
    language: "HTML",
    description: "Basic HTML page structure",
    tags: ["html", "web"],
    category: "web",
    difficulty: "beginner",
  },

  // CSS
  {
    templateId: "css_flexbox",
    title: "CSS Flexbox Layout",
    code: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.item {
  flex: 1;
  min-width: 200px;
  padding: 1rem;
  background: #f0f0f0;
  border-radius: 8px;
}`,
    language: "CSS",
    description: "CSS flexbox layout example",
    tags: ["css", "layout"],
    category: "web",
    difficulty: "intermediate",
  },

  // Java
  {
    templateId: "java_hello_world",
    title: "Hello World - Java",
    code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    language: "Java",
    description: "Classic Hello World in Java",
    tags: ["beginner", "hello-world"],
    category: "backend",
    difficulty: "beginner",
  },

  // C
  {
    templateId: "c_hello_world",
    title: "Hello World - C",
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
    language: "C",
    description: "Classic Hello World in C",
    tags: ["beginner", "hello-world"],
    category: "backend",
    difficulty: "beginner",
  },
];

/**
 * Get all available templates
 */
export function getAllTemplates(): SnippetTemplate[] {
  return TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: SnippetTemplate["category"]
): SnippetTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by language
 */
export function getTemplatesByLanguage(language: string): SnippetTemplate[] {
  return TEMPLATES.filter((t) => t.language === language);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: SnippetTemplate["difficulty"]
): SnippetTemplate[] {
  return TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Search templates by title or description
 */
export function searchTemplates(query: string): SnippetTemplate[] {
  const lowerQuery = query.toLowerCase();
  return TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): SnippetTemplate | undefined {
  return TEMPLATES.find((t) => t.templateId === templateId);
}

/**
 * Get random template
 */
export function getRandomTemplate(): SnippetTemplate {
  return TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
}

/**
 * Get featured/popular templates
 */
export function getFeaturedTemplates(): SnippetTemplate[] {
  const featured = [
    "js_fetch_api",
    "python_decorator",
    "sql_join",
    "react_hook",
    "go_http_server",
  ];
  return TEMPLATES.filter((t) => featured.includes(t.templateId));
}
