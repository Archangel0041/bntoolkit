import { LanguageSelector } from "./LanguageSelector";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sword, Upload } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Sword className="h-6 w-6" />
          <span>Battle Units</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload Images</span>
            </Link>
          </Button>
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
