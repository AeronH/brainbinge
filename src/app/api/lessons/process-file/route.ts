import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use pdf2json for PDF parsing (compatible with Node 18)
async function parsePDF(buffer: Buffer): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("[PDF] Parse error:", errData.parserError);
        reject(new Error(errData.parserError || "Failed to parse PDF"));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          console.log("[PDF] PDF parsed successfully");
          
          // Extract text from all pages - simple and clean
          let text = "";
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            for (const page of pdfData.Pages) {
              if (page.Texts && Array.isArray(page.Texts)) {
                for (const textItem of page.Texts) {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    for (const run of textItem.R) {
                      if (run.T) {
                        try {
                          // Decode URI component (pdf2json encodes text)
                          const decodedText = decodeURIComponent(run.T);
                          text += decodedText + " ";
                        } catch (e) {
                          // If decode fails, use raw text
                          text += run.T + " ";
                        }
                      }
                    }
                  }
                }
              }
              text += "\n\n"; // Add double newline between pages for readability
            }
          }
          
          // Clean up the text - remove excessive whitespace and special characters
          text = text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n\s+\n/g, '\n\n') // Clean up paragraph breaks
            .trim();
          
          console.log("[PDF] Extracted text length:", text.length);
          console.log("[PDF] First 500 chars:", text.substring(0, 500));
          
          resolve({ text });
        } catch (error) {
          console.error("[PDF] Error extracting text from parsed data:", error);
          reject(error);
        }
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error("[PDF parsePDF] Error loading or running pdf2json:", error);
      reject(error);
    }
  });
}

// File size limits in bytes
const FILE_SIZE_LIMITS = {
  pdf: 8 * 1024 * 1024, // 8MB
  word: 8 * 1024 * 1024, // 8MB
  image: 3 * 1024 * 1024, // 3MB
};

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_WORD_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
];
const ALLOWED_PDF_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check for multiple files (images) or single file
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File;

    // Multiple files handling (for images)
    if (files.length > 0) {
      // Validate all files are images
      const invalidFiles = files.filter(file => !ALLOWED_IMAGE_TYPES.includes(file.type));
      if (invalidFiles.length > 0) {
        return NextResponse.json(
          { error: "Multiple files only supported for images (PNG, JPG, WEBP)" },
          { status: 400 }
        );
      }

      // Validate file sizes
      for (const file of files) {
        if (file.size > FILE_SIZE_LIMITS.image) {
          return NextResponse.json(
            { error: `${file.name} exceeds ${FILE_SIZE_LIMITS.image / 1024 / 1024}MB limit` },
            { status: 400 }
          );
        }
      }

      // Process all images in parallel
      console.log(`[Image Processing] Processing ${files.length} image(s)...`);
      const imagePromises = files.map(async (file, index) => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64Image = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${file.type};base64,${base64Image}`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract all visible text from this image (image ${index + 1} of ${files.length}), preserving formatting and structure as much as possible. Include any text from diagrams, labels, notes, or captions. Return only the extracted text, nothing else.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: dataUrl,
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
          });

          const extractedText = response.choices[0].message.content || "";
          console.log(`[Image Processing] Image ${index + 1} (${file.name}): ${extractedText.length} characters extracted`);
          
          return { text: extractedText, fileName: file.name };
        } catch (error) {
          console.error(`[Image Processing] Error processing ${file.name}:`, error);
          throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      const results = await Promise.all(imagePromises);
      
      // Combine all extracted text with separators
      const combinedText = results
        .map((result, index) => {
          const separator = index === 0 ? '' : '\n\n---\n\n';
          return `${separator}[Image ${index + 1}: ${result.fileName}]\n\n${result.text}`;
        })
        .join('\n\n');

      if (!combinedText || combinedText.trim().length < 10) {
        return NextResponse.json(
          { error: "Could not extract text from images. The images may not contain readable text." },
          { status: 400 }
        );
      }

      console.log("[Image Processing] Combined text length:", combinedText.length);
      console.log("[Image Processing] First 200 chars:", combinedText.substring(0, 200));

      return NextResponse.json({
        success: true,
        text: combinedText,
        sourceType: "image",
        fileName: `${files.length} image${files.length > 1 ? 's' : ''}`,
        fileCount: files.length,
      });
    }

    // Single file handling (backward compatibility)
    const file = singleFile;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name;
    const fileSize = file.size;

    // Determine file category
    let fileCategory: "pdf" | "word" | "image" | null = null;
    let extractedText = "";

    if (ALLOWED_PDF_TYPES.includes(fileType)) {
      fileCategory = "pdf";
      
      // Check file size
      if (fileSize > FILE_SIZE_LIMITS.pdf) {
        return NextResponse.json(
          { error: `PDF file size must be under ${FILE_SIZE_LIMITS.pdf / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Extract text from PDF
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log("[PDF] File size:", buffer.length, "bytes");
        console.log("[PDF] Attempting to parse PDF...");
        
        const data = await parsePDF(buffer);
        
        console.log("[PDF] Parse successful. Text length:", data?.text?.length || 0);
        console.log("[PDF] First 200 chars:", data?.text?.substring(0, 200));
        
        extractedText = data.text;

        if (!extractedText || extractedText.trim().length < 10) {
          return NextResponse.json(
            { error: "Could not extract text from PDF. The file may be empty, image-based, or corrupted." },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("[PDF] Extraction error:", error);
        console.error("[PDF] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json(
          { error: `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

    } else if (ALLOWED_WORD_TYPES.includes(fileType)) {
      fileCategory = "word";
      
      // Check file size
      if (fileSize > FILE_SIZE_LIMITS.word) {
        return NextResponse.json(
          { error: `Word document size must be under ${FILE_SIZE_LIMITS.word / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Extract text from Word document
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;

        if (!extractedText || extractedText.trim().length < 10) {
          return NextResponse.json(
            { error: "Could not extract text from Word document. The file may be empty or corrupted." },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Word extraction error:", error);
        return NextResponse.json(
          { error: "Failed to extract text from Word document. Please ensure it's a valid .docx file." },
          { status: 500 }
        );
      }

    } else if (ALLOWED_IMAGE_TYPES.includes(fileType)) {
      fileCategory = "image";
      
      // Check file size
      if (fileSize > FILE_SIZE_LIMITS.image) {
        return NextResponse.json(
          { error: `Image size must be under ${FILE_SIZE_LIMITS.image / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Extract text from image using OpenAI Vision
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${fileType};base64,${base64Image}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all visible text from this image, preserving formatting and structure as much as possible. Include any text from diagrams, labels, notes, or captions. Return only the extracted text, nothing else."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUrl,
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
        });

        extractedText = response.choices[0].message.content || "";

        if (!extractedText || extractedText.trim().length < 10) {
          return NextResponse.json(
            { error: "Could not extract text from image. The image may not contain readable text." },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Image OCR error:", error);
        return NextResponse.json(
          { error: "Failed to extract text from image. Please try a different image." },
          { status: 500 }
        );
      }

    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, Word document (.docx), or image (PNG, JPG, WEBP)." },
        { status: 400 }
      );
    }

    // Ensure text is a plain string (not an object or array)
    const plainText = typeof extractedText === 'string' 
      ? extractedText 
      : String(extractedText);

    console.log("[File Processing] Returning text type:", typeof plainText);
    console.log("[File Processing] Text length:", plainText.length);
    console.log("[File Processing] First 200 chars:", plainText.substring(0, 200));

    return NextResponse.json({
      success: true,
      text: plainText,
      sourceType: fileCategory,
      fileName: fileName,
    });

  } catch (error) {
    console.error("File processing error:", error);
    return NextResponse.json(
      { error: "Failed to process file. Please try again." },
      { status: 500 }
    );
  }
}

