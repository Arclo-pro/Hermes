import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Copy, CheckCircle2, Trash2, Loader2, Lock, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShareData {
  id: string;
  shareUrl: string;
  title?: string;
  passwordProtected: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface ShareReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanId: string;
}

export function ShareReportModal({ open, onOpenChange, scanId }: ShareReportModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("14");
  const [copied, setCopied] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<ShareData | null>(null);

  const { data: existingShares, isLoading: loadingShares } = useQuery<ShareData[]>({
    queryKey: ["shares", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/shares`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!scanId,
  });

  const createShareMutation = useMutation({
    mutationFn: async (data: { title?: string; password?: string; expiryDays?: number }) => {
      const res = await fetch(`/api/scan/${scanId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create share link");
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedShare(data);
      queryClient.invalidateQueries({ queryKey: ["shares", scanId] });
      setTitle("");
      setPassword("");
      setPasswordProtected(false);
      setExpiry("14");
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/scan/${scanId}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke share");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", scanId] });
      if (createdShare) {
        setCreatedShare(null);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expiryDays = expiry === "never" ? undefined : parseInt(expiry);
    createShareMutation.mutate({
      title: title || undefined,
      password: passwordProtected && password ? password : undefined,
      expiryDays,
    });
  };

  const copyToClipboard = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatExpiry = (expiresAt?: string) => {
    if (!expiresAt) return "Never expires";
    const date = new Date(expiresAt);
    return `Expires ${date.toLocaleDateString()}`;
  };

  const handleClose = () => {
    setCreatedShare(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Share2 className="w-5 h-5 text-slate-600" />
            Share Report
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Create a shareable link to this SEO report
          </DialogDescription>
        </DialogHeader>

        {createdShare ? (
          <div className="space-y-4" data-testid="share-success">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Share link created!</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={createdShare.shareUrl}
                  readOnly
                  className="flex-1 bg-white text-slate-700 text-sm"
                  data-testid="input-share-url"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdShare.shareUrl, createdShare.id)}
                  data-testid="btn-copy-share-url"
                >
                  {copied === createdShare.id ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {createdShare.passwordProtected && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Password protected
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCreatedShare(null)}
              data-testid="btn-create-another"
            >
              Create Another Link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="share-form">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700">
                Title (optional)
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My SEO Report"
                className="bg-white border-slate-300 text-slate-900"
                data-testid="input-share-title"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="password-toggle"
                checked={passwordProtected}
                onCheckedChange={(checked) => setPasswordProtected(checked === true)}
                data-testid="checkbox-password-protection"
              />
              <Label
                htmlFor="password-toggle"
                className="text-slate-700 cursor-pointer"
              >
                Password protection
              </Label>
            </div>

            {passwordProtected && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="input-share-password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expiry" className="text-slate-700">
                Link expires after
              </Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger
                  id="expiry"
                  className="bg-white border-slate-300 text-slate-900"
                  data-testid="select-expiry"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              disabled={createShareMutation.isPending}
              data-testid="btn-create-share"
            >
              {createShareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          </form>
        )}

        {existingShares && existingShares.length > 0 && (
          <div className="border-t border-slate-200 pt-4 mt-4" data-testid="existing-shares">
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Existing Share Links ({existingShares.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingShares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  data-testid={`existing-share-${share.id}`}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {share.title || "Untitled"}
                      </span>
                      {share.passwordProtected && (
                        <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{formatExpiry(share.expiresAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(share.shareUrl, share.id)}
                      className="h-8 w-8 p-0"
                      data-testid={`btn-copy-${share.id}`}
                    >
                      {copied === share.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeShareMutation.mutate(share.id)}
                      disabled={revokeShareMutation.isPending}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      data-testid={`btn-revoke-${share.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingShares && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
