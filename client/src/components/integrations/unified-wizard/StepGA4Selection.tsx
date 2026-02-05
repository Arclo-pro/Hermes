/**
 * Step 3: GA4 Selection - Property + Stream picker as dropdowns
 */
import { useEffect } from "react";
import {
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { GA4Property, GA4Stream } from "../useGoogleConnection";

interface StepGA4SelectionProps {
  properties: GA4Property[];
  streams: GA4Stream[];
  isLoadingProperties: boolean;
  isLoadingStreams: boolean;
  selectedPropertyId: string | null;
  selectedStreamId: string | null;
  siteDomain?: string;
  onSelectProperty: (propertyId: string) => void;
  onSelectStream: (streamId: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
  allowSkip?: boolean;
}

export function StepGA4Selection({
  properties,
  streams,
  isLoadingProperties,
  isLoadingStreams,
  selectedPropertyId,
  selectedStreamId,
  siteDomain,
  onSelectProperty,
  onSelectStream,
  onSkip,
  onNext,
  onBack,
  allowSkip = true,
}: StepGA4SelectionProps) {
  // Auto-select if only one property
  useEffect(() => {
    if (properties.length === 1 && !selectedPropertyId) {
      onSelectProperty(properties[0].propertyId);
    }
  }, [properties, selectedPropertyId, onSelectProperty]);

  // Auto-select if only one stream
  useEffect(() => {
    if (streams.length === 1 && selectedPropertyId && !selectedStreamId) {
      onSelectStream(streams[0].streamId);
    }
  }, [streams, selectedPropertyId, selectedStreamId, onSelectStream]);

  // Loading state
  if (isLoadingProperties) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering GA4 properties...</p>
      </div>
    );
  }

  // No properties found
  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No GA4 Properties Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            We couldn't find any Google Analytics 4 properties in your account.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          {allowSkip && (
            <Button variant="outline" fullWidth onClick={onSkip}>
              Skip GA4, continue to Search Console
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const canContinue = selectedPropertyId && selectedStreamId;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6 text-[#7c3aed]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Select GA4 Property</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the property that tracks {siteDomain || "your website"}.
        </p>
      </div>

      {/* Property dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">GA4 Property</label>
        <Select value={selectedPropertyId || undefined} onValueChange={onSelectProperty}>
          <SelectTrigger className="w-full h-11 rounded-xl">
            <SelectValue placeholder="Select a property..." />
          </SelectTrigger>
          <SelectContent>
            {properties.map((prop) => (
              <SelectItem key={prop.propertyId} value={prop.propertyId}>
                {prop.displayName} ({prop.propertyId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stream dropdown — shown once a property is selected */}
      {selectedPropertyId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Data Stream</label>
          {isLoadingStreams ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading streams...
            </div>
          ) : streams.length === 0 ? (
            <p className="text-xs text-amber-600 py-2">
              No web streams found for this property.
            </p>
          ) : (
            <Select value={selectedStreamId || undefined} onValueChange={onSelectStream}>
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue placeholder="Select a data stream..." />
              </SelectTrigger>
              <SelectContent>
                {streams.map((stream) => (
                  <SelectItem key={stream.streamId} value={stream.streamId}>
                    {stream.streamName}
                    {stream.measurementId ? ` (${stream.measurementId})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!canContinue}>
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {allowSkip && (
        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip GA4, continue with just Search Console
        </button>
      )}
    </div>
  );
}
