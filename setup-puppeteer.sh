#!/bin/bash

# Puppeteer PDF Generator Setup Script
# Sets up Node.js environment and generates PDFs

echo "🚀 Setting up Puppeteer PDF Generator"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "Please install Node.js first:"
    echo "  macOS: brew install node"
    echo "  Or download from: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the repository root"
    exit 1
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p docs/html
echo "✅ Directories created"
echo ""

# Initialize package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Initializing package.json..."
    npm init -y
    echo "✅ package.json created"
    echo ""
fi

# Install Puppeteer
echo "📦 Installing Puppeteer..."
echo "(This may take a minute - it downloads Chrome)"
echo ""

npm install puppeteer

echo ""
echo "✅ Puppeteer installed successfully"
echo ""

# Create the generator script
echo "📝 Creating PDF generator script..."

cat > generate-pdfs.js << 'SCRIPT_END'
#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, 'docs/html');
const OUTPUT_DIR = path.join(__dirname, 'docs');

const HTML_FILES = [
  'architecture.html',
  'security-model.html',
  'getting-started.html',
  'integration-guide.html',
  'use-cases.html',
  'mvp-specification.html'
];

const PDF_OPTIONS = {
  format: 'A4',
  margin: {
    top: '15mm',
    bottom: '15mm',
    left: '20mm',
    right: '20mm'
  },
  printBackground: true,
  preferCSSPageSize: false
};

async function generatePDF(htmlFile) {
  const htmlPath = path.join(HTML_DIR, htmlFile);
  const pdfName = htmlFile.replace('.html', '.pdf');
  const pdfPath = path.join(OUTPUT_DIR, pdfName);

  if (!fs.existsSync(htmlPath)) {
    console.log(`  ❌ ${htmlFile} - Not found`);
    return false;
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, ...PDF_OPTIONS });
    await browser.close();

    const stats = fs.statSync(pdfPath);
    const sizeKB = (stats.size / 1024).toFixed(1);

    console.log(`  ✅ ${pdfName} (${sizeKB} KB)`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${pdfName} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Generating PDFs with Puppeteer\n');

  if (!fs.existsSync(HTML_DIR)) {
    console.log('❌ docs/html/ directory not found');
    process.exit(1);
  }

  let generated = 0;
  for (const file of HTML_FILES) {
    if (await generatePDF(file)) generated++;
  }

  console.log(`\n📊 Generated ${generated}/${HTML_FILES.length} PDFs`);

  if (generated === HTML_FILES.length) {
    console.log('🎉 Success!\n');
  }
}

main().catch(console.error);
SCRIPT_END

chmod +x generate-pdfs.js

echo "✅ Generator script created"
echo ""

# Check for HTML files
echo "🔍 Checking for HTML files..."
MISSING=0

HTML_FILES=(
    "architecture.html"
    "security-model.html"
    "getting-started.html"
    "integration-guide.html"
    "use-cases.html"
    "mvp-specification.html"
)

for file in "${HTML_FILES[@]}"; do
    if [ -f "docs/html/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ⚠️  $file (not found - please create it)"
        MISSING=$((MISSING + 1))
    fi
done

echo ""

if [ $MISSING -eq ${#HTML_FILES[@]} ]; then
    echo "⚠️  No HTML files found yet"
    echo ""
    echo "Please save the HTML templates to docs/html/ then run:"
    echo "  node generate-pdfs.js"
elif [ $MISSING -gt 0 ]; then
    echo "⚠️  Missing $MISSING HTML file(s)"
    echo ""
    echo "Save the missing files, then run:"
    echo "  node generate-pdfs.js"
else
    echo "✅ All HTML files found!"
    echo ""
    echo "🎬 Ready to generate PDFs!"
    echo ""
    read -p "Generate PDFs now? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        node generate-pdfs.js
    else
        echo ""
        echo "Run this when ready:"
        echo "  node generate-pdfs.js"
    fi
fi

echo ""
echo "======================================"
echo "Setup complete! 🎉"
echo "======================================"
echo ""