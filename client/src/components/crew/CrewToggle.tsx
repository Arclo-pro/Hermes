import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

const STORAGE_KEY = "hermes-show-crew-names";

export function useCrewNamesToggle() {
  const [showCrewNames, setShowCrewNames] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showCrewNames));
  }, [showCrewNames]);

  return { showCrewNames, setShowCrewNames };
}

interface CrewToggleProps {
  showCrewNames: boolean;
  onToggle: (value: boolean) => void;
}

export function CrewToggle({ showCrewNames, onToggle }: CrewToggleProps) {
  return (
    <div className="flex items-center gap-2" data-testid="crew-toggle">
      <Users className="w-4 h-4 text-muted-foreground" />
      <Label htmlFor="crew-names-toggle" className="text-sm text-muted-foreground cursor-pointer">
        Crew Names
      </Label>
      <Switch
        id="crew-names-toggle"
        checked={showCrewNames}
        onCheckedChange={onToggle}
        data-testid="crew-names-switch"
      />
    </div>
  );
}
