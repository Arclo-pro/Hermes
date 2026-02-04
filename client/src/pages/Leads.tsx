/**
 * Leads Management Page (ArcFlow)
 *
 * Manual lead tracking with outcomes, reason codes, and basic reporting.
 * Phase 1: Manual entry only (no automatic capture).
 */
import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import {
  Contact,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  ArrowUpDown,
  X,
  Loader2,
  MessageSquare,
  ExternalLink,
  BarChart3,
  List,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LeadsAnalytics } from "./leads/LeadsAnalytics";

// ============================================
// Types
// ============================================

interface Lead {
  id: number;
  leadId: string;
  siteId: string;
  createdByUserId: number | null;
  assignedToUserId: number | null;
  leadSourceType: string;
  landingPagePath: string | null;
  sourcePath: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmMedium: string | null;
  utmContent: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: string | null;
  serviceLine: string | null;
  formType: string | null;
  leadStatus: string;
  outcome: string;
  outcomeDate: string | null;
  noSignupReason: string | null;
  noSignupReasonDetail: string | null;
  signupType: string | null;
  appointmentDate: string | null;
  lastContactedAt: string | null;
  contactAttemptsCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadStats {
  total: number;
  signedUp: number;
  notSignedUp: number;
  pending: number;
  conversionRate: number;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

// ============================================
// Constants - Labels for enum values
// ============================================

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  contacted: { label: "Contacted", color: "bg-purple-100 text-purple-700" },
  scheduled: { label: "Scheduled", color: "bg-indigo-100 text-indigo-700" },
  signed_up: { label: "Signed Up", color: "bg-green-100 text-green-700" },
  not_signed_up: { label: "Not Signed Up", color: "bg-red-100 text-red-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700" },
};

const OUTCOME_LABELS: Record<string, { label: string; icon: typeof CheckCircle2 }> = {
  unknown: { label: "Unknown", icon: Clock },
  signed_up: { label: "Signed Up", icon: CheckCircle2 },
  not_signed_up: { label: "Not Signed Up", icon: XCircle },
};

const SERVICE_LINE_LABELS: Record<string, string> = {
  psychiatric_services: "Psychiatric Services",
  psych_evaluation: "Psych Evaluation",
  medication_management: "Medication Management",
  therapy: "Therapy",
  adhd: "ADHD",
  esa: "ESA",
  suboxone: "Suboxone",
  general_inquiry: "General Inquiry",
  other: "Other",
};

const NO_SIGNUP_REASON_LABELS: Record<string, string> = {
  spam: "Spam/Wrong Number",
  wrong_number: "Wrong Number",
  no_answer: "No Answer",
  did_not_respond: "Did Not Respond",
  voicemail_left: "Voicemail Left",
  not_interested: "Not Interested",
  general_information: "General Information",
  waitlist: "Waitlist",
  no_availability: "No Available Spots",
  same_day_appointment: "Same Day Appointment",
  out_of_area: "Out of Area",
  location: "Location",
  // Insurance reasons
  insurance_issue: "Insurance Issue",
  medicaid: "Medicaid",
  medicare: "Medicare",
  humana: "Humana",
  ambetter: "Ambetter",
  hmo_low_payer: "HMO/Low Payer",
  private_pay_expensive: "Can't Afford/OON",
  sunshine_health: "Sunshine Health",
  // Service-related reasons
  benzos_request: "Benzos/Xanax Request",
  requires_md: "Requires MD/Psychologist/Inpatient",
  wrong_service: "Wrong Service",
  couples_therapy: "Couples Therapy",
  under_age: "Under Age",
  adderal: "Adderal Request",
  duplicate_lead: "Duplicate Lead",
  other: "Other",
};

const SIGNUP_TYPE_LABELS: Record<string, string> = {
  scheduled_consult: "Scheduled Consult",
  scheduled_intake: "Scheduled Intake",
  became_patient: "Became Patient",
  referral_out: "Referral Out",
  follow_up_required: "Follow Up Required",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  short_form: "Short Form",
  long_form: "Long Form",
  phone: "Phone",
  sms: "SMS",
  form_submit: "Form Submit",
  phone_click: "Phone Click",
  manual: "Manual",
};

// ============================================
// API Functions
// ============================================

async function fetchLeads(siteId: string, params: Record<string, string>): Promise<LeadsResponse> {
  const searchParams = new URLSearchParams({ siteId, ...params });
  const res = await fetch(`/api/leads?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

async function fetchLeadStats(siteId: string): Promise<LeadStats> {
  const res = await fetch(`/api/leads/stats?siteId=${siteId}`);
  if (!res.ok) throw new Error("Failed to fetch lead stats");
  return res.json();
}

async function createLead(data: Partial<Lead>): Promise<Lead> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create lead");
  }
  return res.json();
}

async function updateLead(leadId: string, data: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update lead");
  }
  return res.json();
}

async function logContactAttempt(leadId: string): Promise<void> {
  const res = await fetch(`/api/leads/${leadId}/contact`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to log contact attempt");
}

async function deleteLead(leadId: string): Promise<void> {
  const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete lead");
  }
}

// ============================================
// Stat Cards Component
// ============================================

function StatCards({ stats, isLoading }: { stats: LeadStats | undefined; isLoading: boolean }) {
  const cards = [
    { label: "Total Leads", value: stats?.total ?? 0, icon: Contact, color: "text-blue-600" },
    { label: "Signed Up", value: stats?.signedUp ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Not Signed Up", value: stats?.notSignedUp ?? 0, icon: XCircle, color: "text-red-600" },
    { label: "Conversion Rate", value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`, icon: AlertCircle, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-white border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                )}
              </div>
              <card.icon className={`w-8 h-8 ${card.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Create Lead Modal
// ============================================

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  onSuccess: () => void;
}

function CreateLeadModal({ open, onOpenChange, siteId, onSuccess }: CreateLeadModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceLine: "general_inquiry",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.email && !formData.phone) {
      toast({ title: "Email or phone is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createLead({
        siteId,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        serviceLine: formData.serviceLine,
        notes: formData.notes.trim() || null,
        leadSourceType: "manual",
      });
      toast({ title: "Lead created successfully" });
      setFormData({ name: "", email: "", phone: "", serviceLine: "general_inquiry", notes: "" });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: err.message || "Failed to create lead", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Enter the lead's contact information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="555-123-4567"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceLine">Service</Label>
            <Select
              value={formData.serviceLine}
              onValueChange={(value) => setFormData({ ...formData, serviceLine: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_LINE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Lead Detail Drawer
// ============================================

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

function LeadDetailDrawer({ lead, open, onOpenChange, onUpdate }: LeadDetailDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset edit data when lead changes
  useMemo(() => {
    if (lead) {
      setEditData({
        leadStatus: lead.leadStatus,
        outcome: lead.outcome,
        noSignupReason: lead.noSignupReason,
        noSignupReasonDetail: lead.noSignupReasonDetail,
        signupType: lead.signupType,
        notes: lead.notes,
      });
    }
  }, [lead?.leadId]);

  const handleSave = async () => {
    if (!lead) return;
    setIsSaving(true);
    try {
      await updateLead(lead.leadId, editData);
      toast({ title: "Lead updated" });
      onUpdate();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogContact = async () => {
    if (!lead) return;
    try {
      await logContactAttempt(lead.leadId);
      toast({ title: "Contact logged" });
      onUpdate();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!confirm("Are you sure you want to delete this lead? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await deleteLead(lead.leadId);
      toast({ title: "Lead deleted" });
      onOpenChange(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!lead) return null;

  const statusInfo = STATUS_LABELS[lead.leadStatus] || STATUS_LABELS.new;
  const outcomeInfo = OUTCOME_LABELS[lead.outcome] || OUTCOME_LABELS.unknown;
  const OutcomeIcon = outcomeInfo.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Contact className="w-5 h-5" />
            {lead.name}
          </SheetTitle>
          <SheetDescription>
            Created {format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              {lead.contactAttemptsCount} contact attempt{lead.contactAttemptsCount !== 1 ? "s" : ""}
              {lead.lastContactedAt && (
                <span className="ml-1">
                  (last: {format(new Date(lead.lastContactedAt), "MMM d")})
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogContact}>
              <Phone className="w-4 h-4 mr-1.5" />
              Log Contact Attempt
            </Button>
          </div>

          {/* Source Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Source</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Type:</span> {SOURCE_TYPE_LABELS[lead.leadSourceType] || lead.leadSourceType}</p>
              <p><span className="text-muted-foreground">Service:</span> {SERVICE_LINE_LABELS[lead.serviceLine || ""] || lead.serviceLine || "—"}</p>
              {lead.landingPagePath && (
                <p><span className="text-muted-foreground">Landing Page:</span> {lead.landingPagePath}</p>
              )}
              {lead.utmSource && (
                <p><span className="text-muted-foreground">UTM Source:</span> {lead.utmSource}</p>
              )}
              {lead.utmCampaign && (
                <p><span className="text-muted-foreground">Campaign:</span> {lead.utmCampaign}</p>
              )}
              {lead.utmTerm && (
                <p><span className="text-muted-foreground">Keyword:</span> {lead.utmTerm}</p>
              )}
            </div>
          </div>

          {/* Status & Outcome */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Status & Outcome</h4>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.leadStatus || lead.leadStatus}
                onValueChange={(value) => setEditData({ ...editData, leadStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={editData.outcome || lead.outcome}
                onValueChange={(value) => setEditData({ ...editData, outcome: value, noSignupReason: null, signupType: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Not Signed Up Reason */}
            {(editData.outcome || lead.outcome) === "not_signed_up" && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select
                  value={editData.noSignupReason || ""}
                  onValueChange={(value) => setEditData({ ...editData, noSignupReason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NO_SIGNUP_REASON_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editData.noSignupReason === "other" && (
                  <Input
                    placeholder="Specify reason..."
                    value={editData.noSignupReasonDetail || ""}
                    onChange={(e) => setEditData({ ...editData, noSignupReasonDetail: e.target.value })}
                  />
                )}
              </div>
            )}

            {/* Conditional: Signed Up Type */}
            {(editData.outcome || lead.outcome) === "signed_up" && (
              <div className="space-y-2">
                <Label>Signup Type</Label>
                <Select
                  value={editData.signupType || ""}
                  onValueChange={(value) => setEditData({ ...editData, signupType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIGNUP_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={editData.notes || ""}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={4}
              placeholder="Add notes about this lead..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete lead"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// Main Leads Page
// ============================================

const PAGE_BG = {
  background: `radial-gradient(1200px circle at 10% 0%, rgba(59, 130, 246, 0.06), transparent 40%),
               radial-gradient(1200px circle at 90% 10%, rgba(16, 185, 129, 0.04), transparent 40%),
               #FFFFFF`,
};

export default function Leads() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId;
  const queryClient = useQueryClient();

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Filter state - default to current month
  const currentMonth = format(new Date(), "yyyy-MM");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    outcome: "all",
    serviceLine: "all",
    month: currentMonth, // Default to current month for faster loading
  });

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      options.push({ value, label });
    }
    return options;
  }, []);

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.outcome && filters.outcome !== "all") params.outcome = filters.outcome;
    if (filters.serviceLine && filters.serviceLine !== "all") params.serviceLine = filters.serviceLine;

    // Handle month filter
    if (filters.month && filters.month !== "all") {
      const [year, month] = filters.month.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));
      params.startDate = startDate.toISOString();
      params.endDate = endDate.toISOString();
    }

    return params;
  }, [filters]);

  // Queries with longer stale times for smoother navigation
  const { data: leadsData, isLoading: leadsLoading, isFetching: leadsFetching, refetch: refetchLeads } = useQuery({
    queryKey: ["leads", siteId, queryParams],
    queryFn: () => fetchLeads(siteId!, queryParams),
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["leads-stats", siteId],
    queryFn: () => fetchLeadStats(siteId!),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handlers
  const handleRefresh = () => {
    refetchLeads();
    queryClient.invalidateQueries({ queryKey: ["leads-stats", siteId] });
    queryClient.invalidateQueries({ queryKey: ["leads-analytics", siteId] });
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDrawer(true);
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "all", outcome: "all", serviceLine: "all", month: "all" });
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status !== "all") || (filters.outcome && filters.outcome !== "all") || (filters.serviceLine && filters.serviceLine !== "all") || (filters.month && filters.month !== "all");

  // Group leads by month for display
  const leadsByMonth = useMemo(() => {
    if (!leadsData?.leads) return {};

    const grouped: Record<string, typeof leadsData.leads> = {};

    for (const lead of leadsData.leads) {
      const monthKey = format(parseISO(lead.createdAt), "yyyy-MM");
      const monthLabel = format(parseISO(lead.createdAt), "MMMM yyyy");

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(lead);
    }

    // Sort by month (most recent first)
    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const sortedGrouped: Record<string, { label: string; leads: typeof leadsData.leads }> = {};

    for (const key of sortedKeys) {
      sortedGrouped[key] = {
        label: format(parseISO(`${key}-01`), "MMMM yyyy"),
        leads: grouped[key],
      };
    }

    return sortedGrouped;
  }, [leadsData?.leads]);

  if (!siteId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <div className="text-center">
          <Contact className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Site Selected</h2>
          <p className="text-muted-foreground">Please select a website to view leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={PAGE_BG}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">Track and manage incoming leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={leadsFetching}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${leadsFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="bg-white/80 border border-border/50">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <LeadsAnalytics siteId={siteId} />
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-6">

        {/* Stat Cards */}
        <StatCards stats={stats} isLoading={statsLoading} />

        {/* Filters */}
        <Card className="bg-white border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.outcome}
                onValueChange={(value) => setFilters({ ...filters, outcome: value })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  {Object.entries(OUTCOME_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.serviceLine}
                onValueChange={(value) => setFilters({ ...filters, serviceLine: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {Object.entries(SERVICE_LINE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.month}
                onValueChange={(value) => setFilters({ ...filters, month: value })}
              >
                <SelectTrigger className="w-[160px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {monthOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white border-border/50">
          <CardContent className="p-0">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !leadsData?.leads?.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Contact className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No leads found</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters ? "Try adjusting your filters" : "Add your first lead to get started"}
                </p>
                {!hasActiveFilters && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Created</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(leadsByMonth).map(([monthKey, monthData]) => (
                    <Fragment key={monthKey}>
                      {/* Month section header */}
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground">{monthData.label}</span>
                            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                              {monthData.leads.length} lead{monthData.leads.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Leads for this month */}
                      {monthData.leads.map((lead) => {
                        const statusInfo = STATUS_LABELS[lead.leadStatus] || STATUS_LABELS.new;
                        const outcomeInfo = OUTCOME_LABELS[lead.outcome] || OUTCOME_LABELS.unknown;
                        const OutcomeIcon = outcomeInfo.icon;

                        return (
                          <TableRow
                            key={lead.leadId}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(lead)}
                          >
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lead.createdAt), "MMM d")}
                            </TableCell>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 text-sm">
                                {lead.phone && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Phone className="w-3 h-3" />
                                    {lead.phone}
                                  </span>
                                )}
                                {lead.email && (
                                  <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[150px]">
                                    <Mail className="w-3 h-3" />
                                    {lead.email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {SERVICE_LINE_LABELS[lead.serviceLine || ""] || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {SOURCE_TYPE_LABELS[lead.leadSourceType] || lead.leadSourceType}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <OutcomeIcon className="w-4 h-4" />
                                {outcomeInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {lead.noSignupReason ? NO_SIGNUP_REASON_LABELS[lead.noSignupReason] || lead.noSignupReason : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Total count */}
        {leadsData && leadsData.total > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {leadsData.leads.length} of {leadsData.total} leads
          </p>
        )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals/Drawers */}
      <CreateLeadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        siteId={siteId}
        onSuccess={handleRefresh}
      />

      <LeadDetailDrawer
        lead={selectedLead}
        open={showDetailDrawer}
        onOpenChange={setShowDetailDrawer}
        onUpdate={handleRefresh}
      />
    </div>
  );
}
