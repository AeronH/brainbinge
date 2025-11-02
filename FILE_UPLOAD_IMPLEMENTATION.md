# File Upload Support Implementation

## Overview
Added support for uploading PDF files, Word documents (.docx), and images to create lessons from them. Files are processed to extract text, then the original files are discarded (only extracted text is stored).

## What Was Implemented

### 1. Dependencies Installed
- `pdf2json` - For extracting text from PDF files (compatible with Node.js 18+)
- `mammoth` - For extracting text from Word documents (.docx)
- OpenAI Vision API (gpt-4o-mini) - For OCR text extraction from images

### 2. File Processing API Route
**Location:** `/src/app/api/lessons/process-file/route.ts`

**Features:**
- Accepts multipart/form-data with file uploads
- Validates file types (PDF, .docx, .doc, PNG, JPG, JPEG, WEBP)
- Enforces file size limits:
  - PDFs: 8MB max
  - Word docs: 8MB max
  - Images: 3MB max
- Extracts text based on file type:
  - **PDF**: Uses `pdf-parse` library
  - **Word**: Uses `mammoth.extractRawText()`
  - **Image**: Uses OpenAI Vision API with OCR prompt
- Returns extracted text and source type
- Provides detailed error messages for failures

### 3. Updated Lesson Generation
**Location:** `/src/app/api/lessons/generate/route.ts`

**Changes:**
- Now accepts `sourceType` parameter (defaults to "text")
- Stores the source type in the database (`text`, `pdf`, `word`, or `image`)
- No changes to generation logic - works with extracted text regardless of source

### 4. Enhanced Create Lesson Modal
**Location:** `/src/components/modals/CreateLessonModal.tsx`

**New Features:**
- Tabbed interface with 3 options:
  - **Paste Text** (default) - Original text input
  - **Upload File** - File upload with drag-and-drop zone
  - **From Link** (disabled) - Coming soon placeholder
- File upload tab includes:
  - Visual drag-and-drop upload zone
  - File type validation on selection
  - File size validation with immediate feedback
  - Selected file preview (name + size)
  - Clear/remove file button
  - User-friendly error messages
- Two-step processing flow:
  1. Extract text from file (shows "Extracting text from file..." toast)
  2. Generate lesson from extracted text
- Automatic form reset after successful submission

### 5. Next.js Configuration
**Location:** `/next.config.ts`

**Changes:**
- Added webpack configuration to externalize `pdf-parse` and `canvas` packages
- Prevents bundling issues with Node.js-specific libraries in API routes
- Ensures proper server-side rendering

## File Size Limits
- **PDF files**: 8MB maximum
- **Word documents**: 8MB maximum  
- **Images**: 3MB maximum

## Supported File Types
- **PDF**: `.pdf` - Direct text extraction (not for scanned PDFs)
- **Word**: `.docx`, `.doc` - Text extraction with formatting preserved
- **Images**: `.png`, `.jpg`, `.jpeg`, `.webp` - OCR via OpenAI Vision

## User Flow

1. **User opens Create Lesson modal**
2. **Selects input method** (Text, File, or Link)
3. **For File Upload:**
   - Clicks upload zone or drags file
   - File is validated for type and size
   - File preview appears with option to remove
   - Clicks "Create Lesson"
4. **Processing:**
   - Toast: "Extracting text from file..."
   - API processes file and extracts text
   - Toast: "Your lesson is being prepared!"
   - Redirected to lesson view
5. **Lesson is created** with extracted content

## Error Handling

### Client-Side Validation
- File type checking (only allowed formats)
- File size checking (with specific limits per type)
- Immediate feedback with error messages
- Submit button disabled if validation fails

### Server-Side Validation
- Double-checks file type and size
- Validates extracted text (minimum 10 characters)
- Specific error messages for different failure cases:
  - "PDF file size must be under 8MB"
  - "Could not extract text from PDF. The file may be empty, image-based, or corrupted."
  - "Unsupported file type. Please upload a PDF, Word document, or image."
  - etc.

## Technical Notes

### PDF Parsing
- Uses `pdf2json` library with CommonJS require()
- Compatible with Node.js 18+ (pdf-parse requires Node 20+)
- Configured as external in webpack to avoid bundling
- Event-based parsing with text extraction from JSON structure
- Works for text-based PDFs (not scanned/image PDFs)

### Word Document Parsing
- Uses `mammoth` library for .docx files
- Extracts raw text without styling
- Compatible with modern .docx format

### Image OCR
- Uses OpenAI Vision API (gpt-4o-mini model)
- Prompt optimized for text extraction
- Works with screenshots, photos of notes, diagrams with labels
- Max 4000 tokens for extracted text

## Database Schema
No schema changes required - the existing `lessons.source_type` field now supports:
- `"text"` - Pasted text
- `"pdf"` - From PDF file
- `"word"` - From Word document
- `"image"` - From image OCR

## Future Enhancements
- **Link support** (YouTube, Wikipedia, etc.) - UI placeholder already in place
- **Drag-and-drop improvements** - Enhanced visual feedback
- **Batch upload** - Process multiple files at once
- **File preview** - Show first page/snippet before processing
- **OCR for scanned PDFs** - Using Vision API for image-based PDFs

