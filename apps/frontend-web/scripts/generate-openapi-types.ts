#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import https from "https";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAPI_YAML_PATH = path.resolve(__dirname, "../../../api/openapi.yaml");
const OUTPUT_DIR = path.resolve(__dirname, "../src/types/generated");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateTypes(yamlPath: string, outPath: string) {
  execSync(`npx openapi-typescript ${yamlPath} -o ${outPath}`, {
    stdio: "inherit",
  });
}

// Generate types for Spenicle API
async function generateAllTypes() {
  try {
    const typesOutPath = path.join(OUTPUT_DIR, "openapi.ts");

    // Check if openapi.yaml exists
    if (!fs.existsSync(OPENAPI_YAML_PATH)) {
      throw new Error(`OpenAPI file not found at ${OPENAPI_YAML_PATH}`);
    }

    console.log(`Reading OpenAPI spec from ${OPENAPI_YAML_PATH}`);

    // Generate TypeScript types from the YAML file
    generateTypes(OPENAPI_YAML_PATH, typesOutPath);

    // Format the generated file
    execSync(`npx prettier --write ${typesOutPath}`, { stdio: "inherit" });

    console.log(`Generated spenicle.openapi.ts`);
    console.log("OpenAPI types generated successfully!");
  } catch (error) {
    console.error("Failed to generate OpenAPI types:", error);
    process.exit(1);
  }
}

generateAllTypes();
