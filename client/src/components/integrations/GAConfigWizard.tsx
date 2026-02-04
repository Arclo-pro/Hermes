import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Users,
  Globe,
  Settings,
  ExternalLink,
  Key,
  Info,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleConnection, type GA4Property, type GA4Stream, type VerifyResult } from "./useGoogleConnection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GAConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteDomain?: string;
}

// ---------------------------------------------------------------------------
// Step indicator (shows 3 steps per spec)
// ---------------------------------------------------------------------------

const STEP_LABELS = ["Sign in", "Select property", "Confirm data"];

function StepIndicator({ currentPhase }: { currentPhase: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentPhase;
        const isComplete = stepNum < currentPhase;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-primary"
                    : isComplete
                      ? "bg-semantic-success"
                      : "bg-muted"
                }`}
              />
              <span className={`text-[10px] mt-1 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-border mb-4" />}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Sign in (Explain + OAuth in one phase)
// ---------------------------------------------------------------------------

function StepSignIn({
  isConnecting,
  error,
  onStart,
  onRetry,
}: {
  isConnecting: boolean;
  error: string | null;
  onStart: () => void;
  onRetry: () => void;
}) {
  if (isConnecting) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connecting to Google...</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            A Google sign-in window has opened. Complete the authorization there, then return here.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Read-only access. No data modification.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-semantic-danger/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-semantic-danger" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connection Failed</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{error}</p>
        </div>
        <Button variant="primary" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connect Google Analytics</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Connect GA4 to show traffic and landing page metrics.
        </p>
      </div>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What we'll use it for:</p>
          <ul className="space-y-2.5">
            {[
              { icon: TrendingUp, text: "Traffic trends" },
              { icon: Target, text: "Top landing pages" },
              { icon: Zap, text: "Conversion signals (if available)" },
              { icon: BarChart3, text: "Smarter prioritization" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        Read-only access. We never modify your data.
      </div>

      <Button variant="primary" fullWidth onClick={onStart}>
        Sign in with Google
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: OAuth Configuration (when credentials aren't set up)
// ---------------------------------------------------------------------------

function FieldHelp({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-background border border-border rounded-xl shadow-xl max-w-sm w-full p-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
  onHelpClick,
}: {
  htmlFor: string;
  children: React.ReactNode;
  onHelpClick: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </Label>
      <button
        type="button"
        onClick={onHelpClick}
        className="p-0.5 rounded-full hover:bg-muted transition-colors"
        title="Show help"
      >
        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-500" />
      </button>
    </div>
  );
}

function StepOAuthConfig({
  onSave,
  isSaving,
  onCancel,
}: {
  onSave: (config: { clientId: string; clientSecret: string; redirectUri: string }) => void;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback`
      : ""
  );
  const [activeHelp, setActiveHelp] = useState<"clientId" | "clientSecret" | "redirectUri" | null>(null);

  const isValid = clientId.trim() && clientSecret.trim() && redirectUri.trim();

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Setup Your Google API</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Create OAuth credentials in Google Cloud to connect your analytics.
        </p>
      </div>

      {/* Quick start link */}
      <a
        href="https://console.cloud.google.com/apis/credentials"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open Google Cloud Console
      </a>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4 space-y-4">
          {/* Client ID Field */}
          <div className="space-y-2">
            <FieldLabel htmlFor="clientId" onHelpClick={() => setActiveHelp("clientId")}>
              Google Client ID
            </FieldLabel>
            <Input
              id="clientId"
              placeholder="xxxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          {/* Client Secret Field */}
          <div className="space-y-2">
            <FieldLabel htmlFor="clientSecret" onHelpClick={() => setActiveHelp("clientSecret")}>
              Google Client Secret
            </FieldLabel>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          {/* Redirect URI Field */}
          <div className="space-y-2">
            <FieldLabel htmlFor="redirectUri" onHelpClick={() => setActiveHelp("redirectUri")}>
              Redirect URI
            </FieldLabel>
            <Input
              id="redirectUri"
              placeholder="https://your-domain.com/api/auth/callback"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="shrink-0">
          Cancel
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={() => onSave({ clientId, clientSecret, redirectUri })}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      {/* Help Modals */}
      <FieldHelp isOpen={activeHelp === "clientId"} onClose={() => setActiveHelp(null)}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-foreground">Google Client ID</h4>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>To get your Client ID:</p>
            <ol className="list-decimal list-inside space-y-1.5 ml-1">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console → Credentials</a></li>
              <li>Click <strong>"+ Create Credentials"</strong> → <strong>"OAuth client ID"</strong></li>
              <li>Select <strong>"Web application"</strong> as the type</li>
              <li>Give it a name (e.g., "Arclo Analytics")</li>
              <li>Copy the <strong>Client ID</strong> shown after creation</li>
            </ol>
            <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2 rounded mt-2">
              <strong>First time?</strong> You'll need to create a project and configure the OAuth consent screen first. Select "External" user type and add your email as a test user.
            </p>
          </div>
        </div>
      </FieldHelp>

      <FieldHelp isOpen={activeHelp === "clientSecret"} onClose={() => setActiveHelp(null)}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-foreground">Google Client Secret</h4>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>To get your Client Secret:</p>
            <ol className="list-decimal list-inside space-y-1.5 ml-1">
              <li>After creating your OAuth client ID, a popup shows both values</li>
              <li>Copy the <strong>Client Secret</strong> (starts with <code className="bg-muted px-1 rounded">GOCSPX-</code>)</li>
              <li>If you missed it, click your OAuth client in the credentials list</li>
              <li>The secret is shown on the right side of the details page</li>
            </ol>
            <p className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 p-2 rounded mt-2">
              <strong>Keep this secret!</strong> Never share this value publicly. It's stored securely on our servers.
            </p>
          </div>
        </div>
      </FieldHelp>

      <FieldHelp isOpen={activeHelp === "redirectUri"} onClose={() => setActiveHelp(null)}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-foreground">Redirect URI</h4>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This URL must be added to Google Cloud:</p>
            <ol className="list-decimal list-inside space-y-1.5 ml-1">
              <li>Go to your OAuth client in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Under <strong>"Authorized redirect URIs"</strong>, click <strong>"+ Add URI"</strong></li>
              <li>Paste this exact URL:</li>
            </ol>
            <div className="bg-muted rounded p-2 font-mono text-xs break-all mt-2">
              {redirectUri}
            </div>
            <p className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded mt-2">
              <strong>Must match exactly!</strong> Google will reject the connection if this URI doesn't match what's configured in your OAuth client.
            </p>
          </div>
        </div>
      </FieldHelp>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2a: Property selection
// ---------------------------------------------------------------------------

function StepPropertySelect({
  properties,
  isLoading,
  selected,
  siteDomain,
  onSelect,
  onBack,
  onNext,
}: {
  properties: GA4Property[];
  isLoading: boolean;
  selected: string | null;
  siteDomain?: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering GA4 properties...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No GA4 Properties Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            We couldn't find any Google Analytics 4 properties in your account.
            Make sure you have a GA4 property set up (not Universal Analytics).
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to create a GA4 property:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to analytics.google.com</li>
            <li>Click Admin (gear icon)</li>
            <li>Click "Create Property"</li>
            <li>Follow the setup wizard</li>
          </ol>
        </div>
        <Button variant="outline" fullWidth onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Select GA4 Property</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the property that tracks {siteDomain || "your website"}.
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {properties.map((prop) => {
          const isSelected = selected === prop.propertyId;
          return (
            <button
              key={prop.propertyId}
              onClick={() => onSelect(prop.propertyId)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{prop.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Property ID: {prop.propertyId}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!selected}>
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2b: Stream selection
// ---------------------------------------------------------------------------

function StepStreamSelect({
  streams,
  isLoading,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  streams: GA4Stream[];
  isLoading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading data streams...</p>
      </div>
    );
  }

  // Auto-select if only one stream
  useEffect(() => {
    if (streams.length === 1 && !selected) {
      onSelect(streams[0].streamId);
    }
  }, [streams, selected, onSelect]);

  if (streams.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Web Streams Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            This property doesn't have any web data streams configured.
            You'll need to add a web stream in Google Analytics first.
          </p>
        </div>
        <Button variant="outline" fullWidth onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Select Different Property
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Select Web Data Stream</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the stream that matches your website.
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {streams.map((stream) => {
          const isSelected = selected === stream.streamId;
          return (
            <button
              key={stream.streamId}
              onClick={() => onSelect(stream.streamId)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{stream.streamName}</p>
                  {stream.measurementId && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {stream.measurementId}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!selected}>
          Save & Verify
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3a: Verifying data
// ---------------------------------------------------------------------------

function StepVerifying() {
  return (
    <div className="space-y-5 text-center py-6">
      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-foreground">Verifying Connection</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Fetching sample data from the last 28 days...
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3b: Verify result (success or error)
// ---------------------------------------------------------------------------

function StepVerifyResult({
  result,
  onRetry,
  onChangeAccount,
  onFinish,
}: {
  result: VerifyResult;
  onRetry: () => void;
  onChangeAccount: () => void;
  onFinish: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-semantic-danger/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-semantic-danger" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Verification Failed</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            {result.error || "Could not fetch data from this GA4 property."}
          </p>
        </div>

        {result.troubleshooting && result.troubleshooting.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">Troubleshooting:</p>
            <ul className="space-y-1 text-muted-foreground">
              {result.troubleshooting.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onChangeAccount} className="flex-1">
            Change Account
          </Button>
          <Button variant="primary" onClick={onRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { sampleMetrics } = result;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-semantic-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-semantic-success" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connected</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Here's a preview of your analytics data.
        </p>
      </div>

      {sampleMetrics && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-4 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Sessions</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sampleMetrics.sessions.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Users</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sampleMetrics.users.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Top landing pages */}
            {sampleMetrics.landingPages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Top Landing Pages</p>
                <div className="space-y-1.5">
                  {sampleMetrics.landingPages.slice(0, 5).map((page, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate flex-1 mr-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        {page.page}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {page.sessions.toLocaleString()} sessions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Data from {sampleMetrics.dateRange.start} to {sampleMetrics.dateRange.end}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What's now unlocked:</p>
          <ul className="space-y-2">
            {[
              "Traffic & conversion insights",
              "Better prioritization of fixes",
              "Weekly trend monitoring",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button variant="primary" fullWidth onClick={onFinish}>
        Finish
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

type WizardStep =
  | "sign-in"
  | "oauth-config"
  | "property-select"
  | "stream-select"
  | "verifying"
  | "verify-result";

function stepToPhase(step: WizardStep): 1 | 2 | 3 {
  switch (step) {
    case "sign-in":
    case "oauth-config":
      return 1;
    case "property-select":
    case "stream-select":
      return 2;
    case "verifying":
    case "verify-result":
      return 3;
  }
}

export function GAConfigWizard({ open, onOpenChange, siteId, siteDomain }: GAConfigWizardProps) {
  const [step, setStep] = useState<WizardStep>("sign-in");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const google = useGoogleConnection(siteId);

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setOauthError(null);

      // If already connected with a property, skip to stream or verify
      if (google.status?.connected && google.status?.ga4?.propertyId) {
        setSelectedPropertyId(google.status.ga4.propertyId);
        if (google.status.ga4.streamId) {
          setSelectedStreamId(google.status.ga4.streamId);
          // If fully configured, show verify result
          if (google.status.integrationStatus === "connected") {
            setStep("verify-result");
          } else {
            setStep("verifying");
          }
        } else {
          setStep("stream-select");
          google.fetchStreams(google.status.ga4.propertyId);
        }
      } else if (google.status?.connected) {
        // Connected but no property selected
        setStep("property-select");
        google.fetchProperties();
      } else {
        setStep("sign-in");
      }
    }
  }, [open, google.status?.connected, google.status?.ga4?.propertyId, google.status?.ga4?.streamId, google.status?.integrationStatus]);

  const handleStartOAuth = async () => {
    setOauthError(null);
    try {
      const success = await google.startOAuth();
      if (success) {
        setStep("property-select");
        google.fetchProperties();
      } else {
        setOauthError("Authorization was cancelled or timed out. Please try again.");
      }
    } catch (err: any) {
      // Check if OAuth isn't configured - show config step
      if (err.message === "OAUTH_NOT_CONFIGURED") {
        setStep("oauth-config");
        return;
      }
      setOauthError(err.message || "Failed to connect. Please try again.");
    }
  };

  const handleSaveOAuthConfig = async (config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }) => {
    setIsSavingConfig(true);
    try {
      // Pass siteId so credentials are saved per-site
      const res = await fetch(`/api/admin/oauth-config?siteId=${encodeURIComponent(siteId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      // Configuration saved, try OAuth again
      setStep("sign-in");
      // Small delay to allow backend to pick up new config
      setTimeout(() => {
        handleStartOAuth();
      }, 500);
    } catch (err: any) {
      setOauthError(err.message || "Failed to save configuration");
      setStep("sign-in");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePropertySelected = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedStreamId(null);
    // Fetch streams for this property
    await google.fetchStreams(propertyId);
    setStep("stream-select");
  };

  const handleSaveAndVerify = async () => {
    if (!selectedPropertyId || !selectedStreamId) return;

    try {
      // Save selections first
      await google.saveProperties({
        ga4PropertyId: selectedPropertyId,
        ga4StreamId: selectedStreamId,
      });

      // Then verify
      setStep("verifying");
      await google.verifyConnection();
      setStep("verify-result");
    } catch {
      // Error handled by mutation
      setStep("verify-result");
    }
  };

  const handleRetryVerify = async () => {
    setStep("verifying");
    try {
      await google.verifyConnection();
    } finally {
      setStep("verify-result");
    }
  };

  const handleChangeAccount = () => {
    setSelectedPropertyId(null);
    setSelectedStreamId(null);
    setStep("sign-in");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Google Analytics</DialogTitle>
          <DialogDescription>Configure Google Analytics for your site</DialogDescription>
        </DialogHeader>

        <StepIndicator currentPhase={stepToPhase(step)} />

        {step === "sign-in" && (
          <StepSignIn
            isConnecting={google.isConnecting}
            error={oauthError}
            onStart={handleStartOAuth}
            onRetry={handleStartOAuth}
          />
        )}

        {step === "oauth-config" && (
          <StepOAuthConfig
            onSave={handleSaveOAuthConfig}
            isSaving={isSavingConfig}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {step === "property-select" && (
          <StepPropertySelect
            properties={google.properties?.ga4 ?? []}
            isLoading={google.isLoadingProperties}
            selected={selectedPropertyId}
            siteDomain={siteDomain}
            onSelect={handlePropertySelected}
            onBack={handleChangeAccount}
            onNext={() => {}} // Not used - selection triggers next step
          />
        )}

        {step === "stream-select" && (
          <StepStreamSelect
            streams={google.streams ?? []}
            isLoading={google.isLoadingStreams}
            selected={selectedStreamId}
            onSelect={setSelectedStreamId}
            onBack={() => {
              setSelectedStreamId(null);
              setStep("property-select");
            }}
            onNext={handleSaveAndVerify}
          />
        )}

        {step === "verifying" && <StepVerifying />}

        {step === "verify-result" && google.verifyResult && (
          <StepVerifyResult
            result={google.verifyResult}
            onRetry={handleRetryVerify}
            onChangeAccount={handleChangeAccount}
            onFinish={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
