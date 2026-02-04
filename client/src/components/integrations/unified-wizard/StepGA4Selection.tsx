/**
 * Step 3: GA4 Selection - Property + Stream picker combined
 */
import { useEffect } from "react";
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

      {/* Property list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {properties.map((prop) => {
          const isSelected = selectedPropertyId === prop.propertyId;
          const showStreams = isSelected && !isLoadingStreams && streams.length > 0;

          return (
            <div key={prop.propertyId}>
              <button
                onClick={() => onSelectProperty(prop.propertyId)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  isSelected
                    ? "border-[#7c3aed] bg-[#7c3aed]/5"
                    : "border-border hover:border-[#7c3aed]/30 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{prop.displayName}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      ID: {prop.propertyId}
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-[#7c3aed] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>

              {/* Inline stream selection */}
              {isSelected && isLoadingStreams && (
                <div className="ml-4 mt-2 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading streams...
                </div>
              )}

              {showStreams && (
                <div className="ml-4 mt-2 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Select data stream:</p>
                  {streams.map((stream) => {
                    const streamSelected = selectedStreamId === stream.streamId;
                    return (
                      <button
                        key={stream.streamId}
                        onClick={() => onSelectStream(stream.streamId)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                          streamSelected
                            ? "border-[#7c3aed] bg-[#7c3aed]/5"
                            : "border-border hover:border-[#7c3aed]/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground">{stream.streamName}</p>
                            {stream.measurementId && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {stream.measurementId}
                              </p>
                            )}
                          </div>
                          {streamSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#7c3aed] shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {isSelected && !isLoadingStreams && streams.length === 0 && (
                <div className="ml-4 mt-2 py-2 text-xs text-amber-600">
                  No web streams found for this property.
                </div>
              )}
            </div>
          );
        })}
      </div>

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
