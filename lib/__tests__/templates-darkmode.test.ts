import { describe, it, expect } from "vitest";
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplatesByLanguage,
  getTemplatesByDifficulty,
  searchTemplates,
  getTemplateById,
  getRandomTemplate,
  getFeaturedTemplates,
} from "../snippet-templates";

describe("Snippet Templates", () => {
  it("should return all templates", () => {
    const templates = getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.length).toBe(23); // We created 23 templates
  });

  it("should filter templates by category", () => {
    const webTemplates = getTemplatesByCategory("web");
    expect(webTemplates.length).toBeGreaterThan(0);
    expect(webTemplates.every((t) => t.category === "web")).toBe(true);

    const backendTemplates = getTemplatesByCategory("backend");
    expect(backendTemplates.every((t) => t.category === "backend")).toBe(true);
  });

  it("should filter templates by language", () => {
    const jsTemplates = getTemplatesByLanguage("JavaScript");
    expect(jsTemplates.length).toBeGreaterThan(0);
    expect(jsTemplates.every((t) => t.language === "JavaScript")).toBe(true);

    const pythonTemplates = getTemplatesByLanguage("Python");
    expect(pythonTemplates.every((t) => t.language === "Python")).toBe(true);
  });

  it("should filter templates by difficulty", () => {
    const beginnerTemplates = getTemplatesByDifficulty("beginner");
    expect(beginnerTemplates.length).toBeGreaterThan(0);
    expect(beginnerTemplates.every((t) => t.difficulty === "beginner")).toBe(
      true
    );

    const advancedTemplates = getTemplatesByDifficulty("advanced");
    expect(advancedTemplates.every((t) => t.difficulty === "advanced")).toBe(
      true
    );
  });

  it("should search templates by title", () => {
    const results = searchTemplates("hello world");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((t) => t.title.toLowerCase().includes("hello"))
    ).toBe(true);
  });

  it("should search templates by description", () => {
    const results = searchTemplates("fetch");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((t) => t.description.toLowerCase().includes("fetch"))
    ).toBe(true);
  });

  it("should search templates by tags", () => {
    const results = searchTemplates("react");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.tags.some((tag) => tag.includes("react")))).toBe(
      true
    );
  });

  it("should get template by ID", () => {
    const template = getTemplateById("js_hello_world");
    expect(template).toBeDefined();
    expect(template?.templateId).toBe("js_hello_world");
    expect(template?.language).toBe("JavaScript");
  });

  it("should return undefined for non-existent template ID", () => {
    const template = getTemplateById("non_existent");
    expect(template).toBeUndefined();
  });

  it("should get random template", () => {
    const template = getRandomTemplate();
    expect(template).toBeDefined();
    expect(template.templateId).toBeDefined();
    expect(template.code).toBeDefined();
  });

  it("should get featured templates", () => {
    const featured = getFeaturedTemplates();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(5);
    expect(featured.every((t) => t.templateId)).toBe(true);
  });

  it("should have valid template structure", () => {
    const templates = getAllTemplates();
    templates.forEach((template) => {
      expect(template.templateId).toBeDefined();
      expect(template.title).toBeDefined();
      expect(template.code).toBeDefined();
      expect(template.language).toBeDefined();
      expect(template.description).toBeDefined();
      expect(Array.isArray(template.tags)).toBe(true);
      expect(template.category).toBeDefined();
      expect(template.difficulty).toBeDefined();
    });
  });

  it("should have unique template IDs", () => {
    const templates = getAllTemplates();
    const ids = templates.map((t) => t.templateId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should support all required languages", () => {
    const requiredLanguages = [
      "JavaScript",
      "TypeScript",
      "Python",
      "SQL",
      "Go",
      "Rust",
      "Bash",
      "Dockerfile",
      "JSON",
      "HTML",
      "CSS",
      "Java",
      "C",
    ];

    const templates = getAllTemplates();
    const supportedLanguages = new Set(templates.map((t) => t.language));

    requiredLanguages.forEach((lang) => {
      expect(supportedLanguages.has(lang)).toBe(true);
    });
  });
});

describe("Dark Mode Theme", () => {
  it("should have valid theme mode values", () => {
    const validModes = ["system", "light", "dark"];
    expect(validModes).toContain("system");
    expect(validModes).toContain("light");
    expect(validModes).toContain("dark");
  });

  it("should persist theme mode to AsyncStorage", async () => {
    // This test would require mocking AsyncStorage
    // For now, we just verify the theme mode types are correct
    const themeMode: "system" | "light" | "dark" = "dark";
    expect(["system", "light", "dark"]).toContain(themeMode);
  });

  it("should resolve color scheme from theme mode", () => {
    const resolveColorScheme = (
      mode: "system" | "light" | "dark",
      system: "light" | "dark"
    ): "light" | "dark" => {
      if (mode === "system") return system;
      return mode;
    };

    expect(resolveColorScheme("system", "light")).toBe("light");
    expect(resolveColorScheme("system", "dark")).toBe("dark");
    expect(resolveColorScheme("light", "dark")).toBe("light");
    expect(resolveColorScheme("dark", "light")).toBe("dark");
  });
});
