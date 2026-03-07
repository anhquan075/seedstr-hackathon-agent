
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import { BuildFile } from '../types.js';

export interface ValidationResult {
 isValid: boolean;
 errors: string[];
}

/**
 * Validates the generated project structure and files
 * Before submission to Seedstr
 */
export class ProjectValidator {
 
 /**
  * Performs quick structural checks on the generated files
  */
 validate(files: BuildFile[]): ValidationResult {
  const errors: string[] = [];

  // 1. Check for entry point
  const hasHtml = files.some(f => f.path.toLowerCase().endsWith('index.html'));
  if (!hasHtml) {
   errors.push("Missing 'index.html' entry point. A web project MUST have an index.html file.");
  }

  // 2. Check for empty files
  files.forEach(file => {
   if (!file.content || file.content.trim().length < 10) {
    errors.push(`File '${file.path}' is empty or too short (less than 10 characters).`);
   }
  });

  // 3. Basic Syntax Checks (HTML/JSON)
  files.forEach(file => {
   if (file.path.endsWith('.json')) {
    try {
     JSON.parse(file.content);
    } catch (e: any) {
     errors.push(`Syntax error in ${file.path}: ${e.message}`);
    }
   }
   
   if (file.path.endsWith('.html')) {
    if (!file.content.includes('<!DOCTYPE html>') && !file.content.includes('<html')) {
     errors.push(`File '${file.path}' does not appear to be a valid HTML file (missing DOCTYPE or <html> tag).`);
    }
   }
  });

  return {
   isValid: errors.length === 0,
   errors
  };
 }

 /**
  * Validates a physical directory (after builder has written files)
  */
 validateDirectory(dirPath: string): ValidationResult {
  const errors: string[] = [];
  
  if (!fs.existsSync(dirPath)) {
   return { isValid: false, errors: [`Directory ${dirPath} does not exist.`] };
  }

  const files = fs.readdirSync(dirPath, { recursive: true }) as string[];
  
  // Check for index.html
  const hasIndex = files.some(f => f.toLowerCase().endsWith('index.html'));
  if (!hasIndex) {
   errors.push("Missing 'index.html' in the build directory.");
  }

  // Check for empty files in directory
  files.forEach(file => {
   const fullPath = path.join(dirPath, file);
   if (fs.statSync(fullPath).isFile()) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.trim().length < 10) {
     errors.push(`File '${file}' in build directory is empty or near-empty.`);
    }
   }
  });

  return {
   isValid: errors.length === 0,
   errors
  };
 }
}
