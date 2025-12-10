import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadMultipleImages, listUploadedImages } from "@/lib/unitImages";
import { Upload, CheckCircle, XCircle, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function UploadImages() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setResults(null);
    setProgress({ current: 0, total: files.length, fileName: "" });

    const uploadResults = await uploadMultipleImages(files, (current, total, fileName) => {
      setProgress({ current, total, fileName });
    });

    setResults(uploadResults);
    setIsUploading(false);

    if (uploadResults.success > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${uploadResults.success} images.`,
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const checkUploadedImages = async () => {
    const images = await listUploadedImages();
    setUploadedCount(images.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload Unit Images</h1>
            <p className="text-muted-foreground">
              Upload your unit images to display them in the database.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to Units</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Image Upload</CardTitle>
            <CardDescription>
              Select multiple image files to upload. File names should match the icon names from the unit data
              (e.g., <code className="bg-muted px-1 rounded">air_ancient_fragment_icon.png</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            
            <div className="flex gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Select Images"}
              </Button>
              
              <Button variant="outline" onClick={checkUploadedImages} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Check Uploaded Count
              </Button>
            </div>

            {uploadedCount !== null && (
              <p className="text-sm text-muted-foreground">
                Currently {uploadedCount} images uploaded in storage.
              </p>
            )}

            {isUploading && (
              <div className="space-y-2">
                <Progress value={(progress.current / progress.total) * 100} />
                <p className="text-sm text-muted-foreground">
                  Uploading {progress.current} of {progress.total}: {progress.fileName}
                </p>
              </div>
            )}

            {results && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{results.success} succeeded</span>
                  </div>
                  {results.failed > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">{results.failed} failed</span>
                    </div>
                  )}
                </div>

                {results.errors.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="font-medium text-destructive mb-2">Errors:</p>
                    <ul className="text-sm text-destructive space-y-1">
                      {results.errors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {results.errors.length > 10 && (
                        <li>...and {results.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Naming Convention</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Image files should be named to match the <code>icon</code> or <code>back_icon</code> fields from the unit data:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code>air_ancient_fragment_icon.png</code> → matches <code>"icon": "air_ancient_fragment_icon"</code></li>
              <li><code>army_view_air_ancient_fragment.png</code> → matches <code>"back_icon": "army_view_air_ancient_fragment"</code></li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
