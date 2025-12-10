import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadMultipleImages, listUploadedImages } from "@/lib/unitImages";
import { uploadMultipleAbilityImages, listUploadedAbilityImages } from "@/lib/abilityImages";
import { uploadMultipleDamageImages, listUploadedDamageImages } from "@/lib/damageImages";
import { Upload, CheckCircle, XCircle, FolderOpen, Users, Swords, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type UploadType = "units" | "abilities" | "damage";

const UPLOAD_CONFIG = {
  units: { fn: uploadMultipleImages, listFn: listUploadedImages, label: "unit" },
  abilities: { fn: uploadMultipleAbilityImages, listFn: listUploadedAbilityImages, label: "ability" },
  damage: { fn: uploadMultipleDamageImages, listFn: listUploadedDamageImages, label: "damage" },
};

export default function UploadImages() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [uploadedCount, setUploadedCount] = useState<Record<UploadType, number | null>>({ units: null, abilities: null, damage: null });
  const [activeTab, setActiveTab] = useState<UploadType>("units");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setResults(null);
    setProgress({ current: 0, total: files.length, fileName: "" });

    const config = UPLOAD_CONFIG[activeTab];
    const uploadResults = await config.fn(files, (current, total, fileName) => {
      setProgress({ current, total, fileName });
    });

    setResults(uploadResults);
    setIsUploading(false);

    if (uploadResults.success > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${uploadResults.success} ${config.label} images.`,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const checkUploadedImages = async (type: UploadType) => {
    const images = await UPLOAD_CONFIG[type].listFn();
    setUploadedCount(prev => ({ ...prev, [type]: images.length }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload Images</h1>
            <p className="text-muted-foreground">
              Upload unit, ability, and damage type images.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to Units</Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as UploadType); setResults(null); }}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="units" className="gap-2">
              <Users className="h-4 w-4" />
              Units
            </TabsTrigger>
            <TabsTrigger value="abilities" className="gap-2">
              <Swords className="h-4 w-4" />
              Abilities
            </TabsTrigger>
            <TabsTrigger value="damage" className="gap-2">
              <Shield className="h-4 w-4" />
              Damage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="space-y-6">
            <UploadCard
              title="Unit Image Upload"
              description={<>File names should match unit icon names (e.g., <code className="bg-muted px-1 rounded">air_ancient_fragment_icon.png</code>).</>}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              onUpload={handleFileSelect}
              onCheckCount={() => checkUploadedImages("units")}
              count={uploadedCount.units}
              countLabel="unit images"
              progress={progress}
              results={results}
            />
          </TabsContent>

          <TabsContent value="abilities" className="space-y-6">
            <UploadCard
              title="Ability Icon Upload"
              description={<>File names should match ability icon names (e.g., <code className="bg-muted px-1 rounded">ancient_lasershot_icon.png</code>).</>}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              onUpload={handleFileSelect}
              onCheckCount={() => checkUploadedImages("abilities")}
              count={uploadedCount.abilities}
              countLabel="ability icons"
              progress={progress}
              results={results}
            />
          </TabsContent>

          <TabsContent value="damage" className="space-y-6">
            <UploadCard
              title="Damage Icon Upload"
              description={<>File names should match damage type names (e.g., <code className="bg-muted px-1 rounded">damage_bullet.png</code>, <code className="bg-muted px-1 rounded">damage_bullet_resistant.png</code>).</>}
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              onUpload={handleFileSelect}
              onCheckCount={() => checkUploadedImages("damage")}
              count={uploadedCount.damage}
              countLabel="damage icons"
              progress={progress}
              results={results}
            />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Naming Conventions</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Unit Images</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code>air_ancient_fragment_icon.png</code></li>
                  <li><code>army_view_air_ancient_fragment.png</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Ability Icons</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code>ancient_lasershot_icon.png</code></li>
                  <li><code>chem_cloud_icon.png</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Damage Icons</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code>damage_bullet.png</code></li>
                  <li><code>damage_bullet_resistant.png</code></li>
                  <li><code>damage_bullet_vulnerable.png</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface UploadCardProps {
  title: string;
  description: React.ReactNode;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckCount: () => void;
  count: number | null;
  countLabel: string;
  progress: { current: number; total: number; fileName: string };
  results: { success: number; failed: number; errors: string[] } | null;
}

function UploadCard({ title, description, fileInputRef, isUploading, onUpload, onCheckCount, count, countLabel, progress, results }: UploadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onUpload}
          className="hidden"
        />
        
        <div className="flex gap-4">
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-2">
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Select Images"}
          </Button>
          
          <Button variant="outline" onClick={onCheckCount} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Check Count
          </Button>
        </div>

        {count !== null && (
          <p className="text-sm text-muted-foreground">Currently {count} {countLabel} uploaded.</p>
        )}

        <UploadProgress isUploading={isUploading} progress={progress} results={results} />
      </CardContent>
    </Card>
  );
}

function UploadProgress({ 
  isUploading, 
  progress, 
  results 
}: { 
  isUploading: boolean; 
  progress: { current: number; total: number; fileName: string }; 
  results: { success: number; failed: number; errors: string[] } | null;
}) {
  return (
    <>
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
    </>
  );
}
