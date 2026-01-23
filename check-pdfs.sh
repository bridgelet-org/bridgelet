#!/bin/bash

# Bridgelet PDF Documentation Diagnostic Script
# This script checks for common issues preventing PDFs from rendering on GitHub

echo "======================================"
echo "Bridgelet PDF Documentation Diagnostics"
echo "======================================"
echo ""

# Check if docs directory exists
if [ ! -d "docs" ]; then
    echo "❌ ERROR: /docs directory not found"
    echo "   Please run this script from the repository root"
    exit 1
fi

cd docs

# Array of expected PDF files
PDFS=(
    "architecture.pdf"
    "security-model.pdf"
    "getting-started.pdf"
    "integration-guide.pdf"
    "use-cases.pdf"
    "mvp-specification.pdf"
)

echo "Checking PDF files..."
echo ""

ISSUES_FOUND=0

for pdf in "${PDFS[@]}"; do
    echo "📄 Checking: $pdf"

    # Check if file exists
    if [ ! -f "$pdf" ]; then
        echo "   ❌ File does not exist"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        echo ""
        continue
    fi

    # Check file size
    SIZE=$(stat -f%z "$pdf" 2>/dev/null || stat -c%s "$pdf" 2>/dev/null)
    SIZE_MB=$(echo "scale=2; $SIZE / 1048576" | bc)

    echo "   📊 Size: ${SIZE_MB}MB"

    if (( $(echo "$SIZE_MB > 1.0" | bc -l) )); then
        echo "   ⚠️  WARNING: File is larger than 1MB (GitHub may not preview)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi

    # Check if it's actually a PDF
    FILE_TYPE=$(file -b --mime-type "$pdf")
    echo "   🔍 MIME type: $FILE_TYPE"

    if [ "$FILE_TYPE" != "application/pdf" ]; then
        echo "   ❌ ERROR: Not a valid PDF file"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi

    # Check for Git LFS
    if git lfs ls-files | grep -q "$pdf"; then
        echo "   🔗 Tracked by Git LFS: YES"
        echo "   ⚠️  WARNING: Git LFS may cause rendering issues"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo "   🔗 Tracked by Git LFS: NO"
    fi

    # Check PDF version and features
    if command -v pdfinfo &> /dev/null; then
        PDF_VERSION=$(pdfinfo "$pdf" 2>/dev/null | grep "PDF version" | awk '{print $3}')
        if [ -n "$PDF_VERSION" ]; then
            echo "   📋 PDF version: $PDF_VERSION"
        fi
    fi

    echo "   ✅ Basic checks passed"
    echo ""
done

echo "======================================"
echo "Summary"
echo "======================================"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No major issues found!"
    echo ""
    echo "If PDFs still don't render on GitHub, try:"
    echo "1. Regenerate PDFs with compression"
    echo "2. Ensure PDF version is 1.4 or higher"
    echo "3. Test in a private/incognito browser window"
else
    echo "⚠️  Found $ISSUES_FOUND potential issues"
    echo ""
    echo "Recommended actions:"
    echo "1. Compress PDFs larger than 1MB"
    echo "2. Remove files from Git LFS if tracked"
    echo "3. Regenerate any invalid PDF files"
fi

echo ""
echo "For more help, see: docs/README.md"
echo "======================================"