import fs from 'node:fs';
import { resolve } from 'node:path';

import { generateApi } from 'swagger-typescript-api';

const SWAGGER_URL = `${process.env.WEB_SERVICE_BASE_URL}/docs/swagger.json`;
const OUTPUT_DIR = resolve(process.cwd(), 'src/types');
const OUTPUT_FILE = 'api.ts';

async function generateTypes(): Promise<void> {
  try {
    console.log('🔄 Fetching Swagger spec from:', SWAGGER_URL);

    // Fetch the swagger spec
    const response = await fetch(SWAGGER_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Swagger spec: ${response.status} ${response.statusText}`);
    }

    const swaggerSpec = await response.json();
    console.log('✅ Successfully fetched Swagger spec');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log('📁 Created output directory:', OUTPUT_DIR);
    }

    console.log('🔄 Generating TypeScript types...');

    // Generate TypeScript types
    await generateApi({
      spec: swaggerSpec,
      output: OUTPUT_DIR,
      fileName: OUTPUT_FILE,
      generateClient: false,
      toJS: false,
      cleanOutput: true,
    });

    // Add custom header to the generated file
    const outputPath = resolve(OUTPUT_DIR, OUTPUT_FILE);
    let generatedContent = fs.readFileSync(outputPath, 'utf8');

    // Remove the built-in swagger-typescript-api header
    generatedContent = generatedContent.replace(
      /^\/\* eslint-disable \*\/\n\/\* tslint:disable \*\/\n\/\/ @ts-nocheck\n\/\*[\s\S]*?\*\/\n\n/,
      ''
    );

    const header = `/* eslint-disable */
/* tslint:disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 * 
 * This file was automatically generated from the Swagger/OpenAPI specification.
 * Any manual changes will be overwritten when the types are regenerated.
 * 
 * To regenerate this file, run: npm run generate-types
 * 
 * Generated on: ${new Date().toISOString()}
 * Source: ${SWAGGER_URL}
 */

`;

    // Prepend header to the cleaned content
    const contentWithHeader = header + generatedContent;
    fs.writeFileSync(outputPath, contentWithHeader, 'utf8');

    console.log('✅ TypeScript types generated successfully!');
    console.log('📁 Output location:', resolve(OUTPUT_DIR, OUTPUT_FILE));
  } catch (error) {
    console.error('❌ Error generating types:', (error as Error).message);

    if ((error as Error).message.includes('ECONNREFUSED') || (error as Error).message.includes('fetch')) {
      console.log('\n💡 Make sure your local development server is running on http://localhost:3000');
      console.log('   Run: npm run dev');
    }

    process.exit(1);
  }
}

// Run the script
generateTypes();
