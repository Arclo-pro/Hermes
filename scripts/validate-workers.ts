#!/usr/bin/env npx tsx
import { runValidation, generateMarkdownReport } from "../server/validation";
import * as fs from "fs";
import * as path from "path";

interface CLIOptions {
  workers?: string[];
  category?: string;
  crew?: string;
  format: "json" | "markdown" | "both";
  output?: string;
  parallel: boolean;
  verbose: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    format: "markdown",
    parallel: true,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--workers" || arg === "-w") {
      const value = args[++i];
      options.workers = value.split(",").map(s => s.trim());
    } else if (arg === "--category" || arg === "-c") {
      options.category = args[++i];
    } else if (arg === "--crew") {
      options.crew = args[++i];
    } else if (arg === "--format" || arg === "-f") {
      options.format = args[++i] as "json" | "markdown" | "both";
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--sequential") {
      options.parallel = false;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function printHelp() {
  console.log(`
Worker Validation Harness

Usage: npx tsx scripts/validate-workers.ts [options]

Options:
  -w, --workers <slugs>    Comma-separated list of worker slugs to test
  -c, --category <cat>     Filter by category (analysis, content, infrastructure, execution)
  --crew <crew>            Filter by crew (Dev, SEO, Ads, Content)
  -f, --format <format>    Output format: json, markdown, or both (default: markdown)
  -o, --output <path>      Output file path (default: stdout for markdown, ./reports for files)
  --sequential             Run tests sequentially instead of in parallel
  -v, --verbose            Show detailed output
  -h, --help               Show this help message

Examples:
  npx tsx scripts/validate-workers.ts
  npx tsx scripts/validate-workers.ts --workers serp_intel,crawl_render
  npx tsx scripts/validate-workers.ts --category analysis --format json
  npx tsx scripts/validate-workers.ts --crew SEO --output ./report.md
`);
}

async function main() {
  const options = parseArgs();
  
  console.log("Starting worker validation...\n");
  
  if (options.verbose) {
    console.log("Options:", options);
  }
  
  try {
    const report = await runValidation({
      workers: options.workers,
      category: options.category,
      crew: options.crew,
      parallel: options.parallel,
    });
    
    console.log(`\nValidation complete!`);
    console.log(`  Total: ${report.totalWorkers}`);
    console.log(`  Passed: ${report.passed}`);
    console.log(`  Failed: ${report.failed}`);
    console.log(`  Skipped: ${report.skipped}`);
    console.log(`  Warnings: ${report.warning}`);
    
    if (report.summary.commonIssues.length > 0) {
      console.log("\nCommon Issues:");
      for (const issue of report.summary.commonIssues) {
        console.log(`  - ${issue}`);
      }
    }
    
    const reportsDir = options.output || "./reports";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    
    if (options.format === "json" || options.format === "both") {
      const jsonPath = options.output 
        ? options.output.endsWith(".json") ? options.output : `${options.output}.json`
        : path.join(reportsDir, `worker-validation-${timestamp}.json`);
      
      if (!fs.existsSync(path.dirname(jsonPath))) {
        fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log(`\nJSON report saved to: ${jsonPath}`);
    }
    
    if (options.format === "markdown" || options.format === "both") {
      const markdown = generateMarkdownReport(report);
      
      if (options.output || options.format === "both") {
        const mdPath = options.output
          ? options.output.endsWith(".md") ? options.output : `${options.output}.md`
          : path.join(reportsDir, `worker-validation-${timestamp}.md`);
        
        if (!fs.existsSync(path.dirname(mdPath))) {
          fs.mkdirSync(path.dirname(mdPath), { recursive: true });
        }
        
        fs.writeFileSync(mdPath, markdown);
        console.log(`\nMarkdown report saved to: ${mdPath}`);
      } else {
        console.log("\n" + "=".repeat(60));
        console.log(markdown);
      }
    }
    
    process.exit(report.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error("Validation failed:", error.message);
    process.exit(1);
  }
}

main();
