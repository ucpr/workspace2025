#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface Field {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  attributes: string[];
}

interface Model {
  name: string;
  fields: Field[];
  attributes: string[];
  rawContent: string;
}

interface Enum {
  name: string;
  values: string[];
  rawContent: string;
}

interface Generator {
  name: string;
  provider: string;
  rawContent: string;
}

interface Datasource {
  name: string;
  provider: string;
  url: string;
  rawContent: string;
}

interface Schema {
  generators: Generator[];
  datasources: Datasource[];
  models: Model[];
  enums: Enum[];
}

class PrismaSchemaParser {
  private content: string;
  private lines: string[];
  private currentIndex: number = 0;

  constructor(content: string) {
    this.content = content;
    this.lines = content.split('\n');
  }

  parse(): Schema {
    const schema: Schema = {
      generators: [],
      datasources: [],
      models: [],
      enums: []
    };

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex].trim();

      if (line.startsWith('generator ')) {
        schema.generators.push(this.parseGenerator());
      } else if (line.startsWith('datasource ')) {
        schema.datasources.push(this.parseDatasource());
      } else if (line.startsWith('model ')) {
        schema.models.push(this.parseModel());
      } else if (line.startsWith('enum ')) {
        schema.enums.push(this.parseEnum());
      } else {
        this.currentIndex++;
      }
    }

    return schema;
  }

  private parseGenerator(): Generator {
    const startIndex = this.currentIndex;
    const nameMatch = this.lines[this.currentIndex].match(/generator\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : '';

    this.currentIndex++;
    const generator: Generator = {
      name,
      provider: '',
      rawContent: ''
    };

    while (this.currentIndex < this.lines.length && !this.lines[this.currentIndex].trim().startsWith('}')) {
      const line = this.lines[this.currentIndex].trim();
      if (line.includes('provider')) {
        const providerMatch = line.match(/provider\s*=\s*"([^"]+)"/);
        if (providerMatch) {
          generator.provider = providerMatch[1];
        }
      }
      this.currentIndex++;
    }

    this.currentIndex++; // Skip closing }
    generator.rawContent = this.lines.slice(startIndex, this.currentIndex).join('\n');
    return generator;
  }

  private parseDatasource(): Datasource {
    const startIndex = this.currentIndex;
    const nameMatch = this.lines[this.currentIndex].match(/datasource\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : '';

    this.currentIndex++;
    const datasource: Datasource = {
      name,
      provider: '',
      url: '',
      rawContent: ''
    };

    while (this.currentIndex < this.lines.length && !this.lines[this.currentIndex].trim().startsWith('}')) {
      const line = this.lines[this.currentIndex].trim();
      if (line.includes('provider')) {
        const providerMatch = line.match(/provider\s*=\s*"([^"]+)"/);
        if (providerMatch) {
          datasource.provider = providerMatch[1];
        }
      } else if (line.includes('url')) {
        const urlMatch = line.match(/url\s*=\s*(.+)/);
        if (urlMatch) {
          datasource.url = urlMatch[1].trim();
        }
      }
      this.currentIndex++;
    }

    this.currentIndex++; // Skip closing }
    datasource.rawContent = this.lines.slice(startIndex, this.currentIndex).join('\n');
    return datasource;
  }

  private parseModel(): Model {
    const startIndex = this.currentIndex;
    const nameMatch = this.lines[this.currentIndex].match(/model\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : '';

    this.currentIndex++;
    const model: Model = {
      name,
      fields: [],
      attributes: [],
      rawContent: ''
    };

    while (this.currentIndex < this.lines.length && !this.lines[this.currentIndex].trim().startsWith('}')) {
      const line = this.lines[this.currentIndex].trim();

      if (line.startsWith('@@')) {
        model.attributes.push(line);
      } else if (line && !line.startsWith('//')) {
        const field = this.parseField(line);
        if (field) {
          model.fields.push(field);
        }
      }
      this.currentIndex++;
    }

    this.currentIndex++; // Skip closing }
    model.rawContent = this.lines.slice(startIndex, this.currentIndex).join('\n');
    return model;
  }

  private parseField(line: string): Field | null {
    // Parse field: name Type @attribute
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
    if (!fieldMatch) return null;

    const [, name, baseType, arrayBrackets, questionMark, rest] = fieldMatch;

    return {
      name,
      type: baseType,
      isOptional: !!questionMark,
      isList: !!arrayBrackets,
      attributes: rest ? [rest.trim()] : []
    };
  }

  private parseEnum(): Enum {
    const startIndex = this.currentIndex;
    const nameMatch = this.lines[this.currentIndex].match(/enum\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : '';

    this.currentIndex++;
    const enumDef: Enum = {
      name,
      values: [],
      rawContent: ''
    };

    while (this.currentIndex < this.lines.length && !this.lines[this.currentIndex].trim().startsWith('}')) {
      const line = this.lines[this.currentIndex].trim();
      if (line && !line.startsWith('//') && !line.startsWith('@@')) {
        enumDef.values.push(line);
      }
      this.currentIndex++;
    }

    this.currentIndex++; // Skip closing }
    enumDef.rawContent = this.lines.slice(startIndex, this.currentIndex).join('\n');
    return enumDef;
  }
}

class DependencyAnalyzer {
  private schema: Schema;
  private dependencies: Map<string, Set<string>> = new Map();
  private reverseDependencies: Map<string, Set<string>> = new Map();

  constructor(schema: Schema) {
    this.schema = schema;
    this.analyzeDependencies();
  }

  private analyzeDependencies() {
    // Initialize maps
    for (const model of this.schema.models) {
      this.dependencies.set(model.name, new Set());
      this.reverseDependencies.set(model.name, new Set());
    }

    // Analyze each model
    for (const model of this.schema.models) {
      for (const field of model.fields) {
        // Check if the field type is another model
        const referencedModel = this.schema.models.find(m => m.name === field.type);
        if (referencedModel) {
          this.dependencies.get(model.name)?.add(referencedModel.name);
          this.reverseDependencies.get(referencedModel.name)?.add(model.name);
        }

        // Check for @relation attributes
        const relationMatch = field.attributes.join(' ').match(/@relation\([^)]*references:\s*\[([^\]]+)\]/);
        if (relationMatch) {
          // This model depends on the referenced model
          const referencedModelName = field.type;
          if (this.schema.models.find(m => m.name === referencedModelName)) {
            this.dependencies.get(model.name)?.add(referencedModelName);
            this.reverseDependencies.get(referencedModelName)?.add(model.name);
          }
        }
      }
    }
  }

  getIndependentModels(): Model[] {
    const independentModels: Model[] = [];

    for (const model of this.schema.models) {
      const deps = this.dependencies.get(model.name) || new Set();
      const revDeps = this.reverseDependencies.get(model.name) || new Set();

      // A model is independent if it has no dependencies and no other models depend on it
      if (deps.size === 0 && revDeps.size === 0) {
        independentModels.push(model);
      }
    }

    return independentModels;
  }

  getDependencyGraph(): Map<string, Set<string>> {
    return new Map(this.dependencies);
  }

  getReverseDependencyGraph(): Map<string, Set<string>> {
    return new Map(this.reverseDependencies);
  }

  // Get all models that a given model depends on (transitively)
  getTransitiveDependencies(modelName: string): Set<string> {
    const visited = new Set<string>();
    const queue = [modelName];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      const deps = this.dependencies.get(current) || new Set();
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }

    visited.delete(modelName); // Remove self
    return visited;
  }
}

class SchemaSplitter {
  private schema: Schema;
  private analyzer: DependencyAnalyzer;

  constructor(schema: Schema) {
    this.schema = schema;
    this.analyzer = new DependencyAnalyzer(schema);
  }

  splitIndependentModels(outputDir: string) {
    const independentModels = this.analyzer.getIndependentModels();

    if (independentModels.length === 0) {
      console.log('No independent models found.');
      return;
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write independent models to a separate file
    const independentSchemaContent = this.generateSchemaContent(independentModels);
    const outputPath = path.join(outputDir, 'independent-models.prisma');
    fs.writeFileSync(outputPath, independentSchemaContent);

    console.log(`\nIndependent models written to: ${outputPath}`);
    console.log('Independent models:', independentModels.map(m => m.name).join(', '));

    // Write remaining models
    const remainingModels = this.schema.models.filter(
      model => !independentModels.some(im => im.name === model.name)
    );

    if (remainingModels.length > 0) {
      const remainingSchemaContent = this.generateSchemaContent(remainingModels);
      const remainingPath = path.join(outputDir, 'dependent-models.prisma');
      fs.writeFileSync(remainingPath, remainingSchemaContent);
      console.log(`\nDependent models written to: ${remainingPath}`);
    }

    // Write dependency graph visualization
    this.writeDependencyGraph(outputDir);
  }

  private generateSchemaContent(models: Model[]): string {
    const lines: string[] = [];

    // Add generators and datasources
    for (const generator of this.schema.generators) {
      lines.push(generator.rawContent);
      lines.push('');
    }

    for (const datasource of this.schema.datasources) {
      lines.push(datasource.rawContent);
      lines.push('');
    }

    // Add required enums
    const requiredEnums = new Set<string>();
    for (const model of models) {
      for (const field of model.fields) {
        const enumDef = this.schema.enums.find(e => e.name === field.type);
        if (enumDef) {
          requiredEnums.add(enumDef.name);
        }
      }
    }

    for (const enumDef of this.schema.enums) {
      if (requiredEnums.has(enumDef.name)) {
        lines.push(enumDef.rawContent);
        lines.push('');
      }
    }

    // Add models
    for (const model of models) {
      lines.push(model.rawContent);
      lines.push('');
    }

    return lines.join('\n').trim() + '\n';
  }

  private writeDependencyGraph(outputDir: string) {
    const graphPath = path.join(outputDir, 'dependency-graph.md');
    const lines: string[] = ['# Prisma Schema Dependency Graph\n'];

    lines.push('## Model Dependencies\n');

    const deps = this.analyzer.getDependencyGraph();
    for (const [model, dependencies] of deps) {
      if (dependencies.size > 0) {
        lines.push(`- **${model}** → ${Array.from(dependencies).join(', ')}`);
      } else {
        lines.push(`- **${model}** (no dependencies)`);
      }
    }

    lines.push('\n## Reverse Dependencies (Models that depend on each)\n');

    const revDeps = this.analyzer.getReverseDependencyGraph();
    for (const [model, dependents] of revDeps) {
      if (dependents.size > 0) {
        lines.push(`- **${model}** ← ${Array.from(dependents).join(', ')}`);
      }
    }

    lines.push('\n## Independent Models\n');
    const independentModels = this.analyzer.getIndependentModels();
    if (independentModels.length > 0) {
      lines.push(independentModels.map(m => `- ${m.name}`).join('\n'));
    } else {
      lines.push('No independent models found.');
    }

    fs.writeFileSync(graphPath, lines.join('\n'));
    console.log(`\nDependency graph written to: ${graphPath}`);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: ts-node prisma-schema-splitter.ts <schema.prisma> [output-dir]');
    process.exit(1);
  }

  const schemaPath = args[0];
  const outputDir = args[1] || './prisma-split';

  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  console.log(`Analyzing Prisma schema: ${schemaPath}`);

  const content = fs.readFileSync(schemaPath, 'utf-8');
  const parser = new PrismaSchemaParser(content);
  const schema = parser.parse();

  console.log(`Found ${schema.models.length} models, ${schema.enums.length} enums`);

  const splitter = new SchemaSplitter(schema);
  splitter.splitIndependentModels(outputDir);
}

if (require.main === module) {
  main();
}
