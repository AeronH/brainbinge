"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, FileText, Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { SubscriptionModal } from "./SubscriptionModal";

// Hardcoded Speechify voice IDs mapped to personalities
const VOICE_ID_MAP: Record<string, string> = {
  freeman: "freeman-voice-id", // TODO: Replace with actual Freeman voice ID
  snoop: "81dd4427-89aa-4a1a-9527-d225b44f7b28",
  comedian: "comedian-voice-id", // TODO: Replace with actual comedian voice ID
  mentor: "mentor-voice-id", // TODO: Replace with actual mentor voice ID
};

interface CreateLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLessonCreating?: (lessonId: string) => void;
}

export default function CreateLessonModal({ open, onOpenChange, onLessonCreating }: CreateLessonModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [inputMethod, setInputMethod] = useState<"text" | "file" | "image" | "link">("text");
  const [formData, setFormData] = useState({
    content: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Process PDF/Word files (single file only)
  const processFile = (file: File) => {
    setFileError(null);

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError(`Unsupported file type: ${file.name}. Please upload a PDF or Word document.`);
      return;
    }

    const maxSizes: Record<string, number> = {
      "application/pdf": 8 * 1024 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 8 * 1024 * 1024,
      "application/msword": 8 * 1024 * 1024,
    };

    const maxSize = maxSizes[file.type];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024;
      setFileError(`${file.name} exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setSelectedFile(file);
  };

  // Process images (multiple allowed)
  const processImages = (files: File[]) => {
    if (files.length === 0) return;

    setFileError(null);

    const imageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxSize = 3 * 1024 * 1024; // 3MB

    for (const file of files) {
      if (!imageTypes.includes(file.type)) {
        setFileError(`Unsupported file type: ${file.name}. Please upload images only (PNG, JPG, WEBP).`);
        return;
      }

      if (file.size > maxSize) {
        setFileError(`${file.name} exceeds 3MB limit`);
        return;
      }
    }

    // Append to existing images
    setSelectedImages(prev => [...prev, ...files]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    processImages(files);
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const imageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const isImage = files.every(file => imageTypes.includes(file.type));

    if (isImage && inputMethod === "image") {
      processImages(files);
    } else if (!isImage && inputMethod === "file" && files.length === 1) {
      processFile(files[0]);
    } else {
      setFileError(isImage ? "Please use the Images tab for image uploads" : "Please use the Upload File tab for PDF/Word documents");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    if (newImages.length === 0) {
      setFileError(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  const handleClearAllImages = () => {
    setSelectedImages([]);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input based on method
    if (inputMethod === "text" && !formData.content) {
      toast.error("Please add lesson content");
      return;
    }

    if (inputMethod === "file" && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (inputMethod === "image" && selectedImages.length === 0) {
      toast.error("Please select at least one image to upload");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to create a lesson");
        return;
      }

      // Check subscription status and lesson limit for free users
      const { data: profile } = await supabase
        .from("users")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
      
      const isSubscribed = profile?.subscription_status === "active";
      
      if (!isSubscribed) {
        const { count } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        if (count && count >= 1) {
          setShowSubscriptionModal(true);
          return;
        }
      }

      let contentToGenerate = formData.content;
      let sourceType = "text";

      // Process files based on input method
      if (inputMethod === "file" && selectedFile) {
        // Single PDF/Word file
        const fileFormData = new FormData();
        fileFormData.append("file", selectedFile);

        const processResponse = await fetch("/api/lessons/process-file", {
          method: "POST",
          body: fileFormData,
        });

        const processData = await processResponse.json();

        if (!processResponse.ok) {
          throw new Error(processData.error || "Failed to process file");
        }

        const { text, sourceType: fileSourceType } = processData;
        contentToGenerate = typeof text === 'string' ? text : String(text);
        sourceType = fileSourceType;
      } else if (inputMethod === "image" && selectedImages.length > 0) {
        // Multiple images
        const fileFormData = new FormData();
        selectedImages.forEach((file) => {
          fileFormData.append("files", file);
        });

        const processResponse = await fetch("/api/lessons/process-file", {
          method: "POST",
          body: fileFormData,
        });

        const processData = await processResponse.json();

        if (!processResponse.ok) {
          throw new Error(processData.error || "Failed to process images");
        }

        const { text, sourceType: fileSourceType } = processData;
        contentToGenerate = typeof text === 'string' ? text : String(text);
        sourceType = fileSourceType;
      }

      // Call API to create lesson and trigger generation
      const generateResponse = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToGenerate,
          userId: user.id,
          sourceType: sourceType,
        }),
      });

      // Parse response once - can't read body stream twice
      const responseData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(responseData.error || responseData.details || "Failed to generate lesson");
      }

      const { lessonId } = responseData;

      // Close modal immediately
      onOpenChange(false);
      
      // Reset form
      setFormData({
        content: "",
      });
      setSelectedFile(null);
      setSelectedImages([]);
      setFileError(null);
      setInputMethod("text");

      // Notify dashboard immediately to show loading card
      if (onLessonCreating) {
        onLessonCreating(lessonId);
      }

      // Show toast
      toast.success("Preparing your lesson...");
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create lesson. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Lesson</DialogTitle>
          <DialogDescription>
            Choose how you want to add your learning material
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "file" | "image" | "link")} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                PDF/Word
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="link" disabled className="flex items-center gap-2 opacity-50">
                <LinkIcon className="w-4 h-4" />
                From Link
              </TabsTrigger>
            </TabsList>

            {/* Text Input Tab */}
            <TabsContent value="text" className="space-y-2 mt-4">
              <Label htmlFor="content" className="text-sm font-medium">
                Lesson Content *
              </Label>
              <Textarea
                id="content"
                placeholder="Paste your notes, article, or any learning material here... OR input a topic you want to learn about"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[240px] bg-muted border-border resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your lesson will be generated and ready for interactive Q&A
              </p>
            </TabsContent>

            {/* File Upload Tab (PDF/Word) */}
            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  Upload PDF or Word Document *
                </Label>
                
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <Label
                      htmlFor="file-input"
                      className="cursor-pointer text-sm font-medium text-primary hover:underline"
                    >
                      {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      PDF or Word Document (.docx, .doc)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max size: 8MB
                    </p>
                  </div>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Display selected file */}
                {selectedFile && (
                  <div className="border border-border rounded-lg p-4 bg-muted">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFile}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {fileError && (
                  <p className="text-xs text-destructive">{fileError}</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                We'll extract the text from your document and generate a lesson from it
              </p>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="images" className="text-sm font-medium">
                  Upload Images *
                </Label>
                
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <Label
                      htmlFor="image-input"
                      className="cursor-pointer text-sm font-medium text-primary hover:underline"
                    >
                      {isDragging ? "Drop images here" : "Click to upload or drag and drop"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Images (PNG, JPG, WEBP)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max size: 3MB per image
                    </p>
                    {selectedImages.length === 0 && (
                      <p className="text-xs text-primary font-medium mt-2">
                        💡 Tip: Select multiple images to combine them into one lesson
                      </p>
                    )}
                    {selectedImages.length > 0 && (
                      <p className="text-xs text-primary font-medium mt-2">
                        💡 You can add more images by clicking or dragging
                      </p>
                    )}
                  </div>
                  <Input
                    id="image-input"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleImageChange}
                    className="hidden"
                    multiple
                  />
                </div>

                {/* Display selected images */}
                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllImages}
                        className="h-8 text-xs"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="border border-border rounded-lg p-3 bg-muted flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(index)}
                            className="h-8 w-8 p-0 ml-2 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fileError && (
                  <p className="text-xs text-destructive">{fileError}</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                We'll extract the text from your image{selectedImages.length > 1 ? 's' : ''} and generate a lesson from it
              </p>
            </TabsContent>

            {/* Link Tab (Coming Soon) */}
            <TabsContent value="link" className="space-y-2 mt-4">
              <div className="border border-border rounded-lg p-8 text-center bg-muted/50">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Create lessons from YouTube videos, Wikipedia pages, and more
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                (inputMethod === "file" && (!selectedFile || !!fileError)) ||
                (inputMethod === "image" && (selectedImages.length === 0 || !!fileError)) ||
                !!fileError
              }
              className="flex-1 bg-gradient-to-r from-[#dc2626] to-[#ef4444] hover:from-[#b91c1c] hover:to-[#dc2626] text-white"
            >
              {isLoading ? "Creating..." : "Create Lesson"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    <SubscriptionModal 
      open={showSubscriptionModal}
      onOpenChange={setShowSubscriptionModal}
      feature="additional lessons"
    />
  </>
  );
}


