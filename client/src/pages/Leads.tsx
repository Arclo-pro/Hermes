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

async function fetchLeadStats(siteId: string, startDate?: string, endDate?: string): Promise<LeadStats> {
  const params = new URLSearchParams({ siteId });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const res = await fetch(`/api/leads/stats?${params}`);
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

function computeChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "flat" };
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.abs(pct), direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" };
}

function ChangeIndicator({ pct, direction, invertColors }: { pct: number; direction: "up" | "down" | "flat"; invertColors?: boolean }) {
  if (direction === "flat") return <span className="text-xs text-gray-400 ml-1">—</span>;
  const isGood = invertColors ? direction === "down" : direction === "up";
  const color = isGood ? "text-green-600" : "text-red-600";
  const arrow = direction === "up" ? "↑" : "↓";
  return (
    <span className={`text-xs font-medium ${color} ml-1.5`}>
      {arrow} {pct.toFixed(1)}%
    </span>
  );
}

interface StatCardsProps {
  stats: LeadStats | undefined;
  prevStats: LeadStats | undefined;
  isLoading: boolean;
  hasPeriodComparison: boolean;
}

function StatCards({ stats, prevStats, isLoading, hasPeriodComparison }: StatCardsProps) {
  const totalChange = hasPeriodComparison && stats && prevStats ? computeChange(stats.total, prevStats.total) : null;
  const signedUpChange = hasPeriodComparison && stats && prevStats ? computeChange(stats.signedUp, prevStats.signedUp) : null;
  const notSignedUpChange = hasPeriodComparison && stats && prevStats ? computeChange(stats.notSignedUp, prevStats.notSignedUp) : null;
  const conversionChange = hasPeriodComparison && stats && prevStats ? computeChange(stats.conversionRate, prevStats.conversionRate) : null;

  const cards = [
    {
      label: "Total Leads",
      value: stats?.total ?? 0,
      icon: Contact,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      border: "border-blue-200",
      glow: "shadow-[inset_0_1px_0_0_rgba(59,130,246,0.15),0_0_20px_-5px_rgba(59,130,246,0.12)]",
      bar: "bg-blue-500",
      change: totalChange,
      invertColors: false,
    },
    {
      label: "Signed Up",
      value: stats?.signedUp ?? 0,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      border: "border-green-200",
      glow: "shadow-[inset_0_1px_0_0_rgba(34,197,94,0.15),0_0_20px_-5px_rgba(34,197,94,0.12)]",
      bar: "bg-green-500",
      change: signedUpChange,
      invertColors: false,
    },
    {
      label: "Not Signed Up",
      value: stats?.notSignedUp ?? 0,
      icon: XCircle,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
      border: "border-red-200",
      glow: "shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15),0_0_20px_-5px_rgba(239,68,68,0.12)]",
      bar: "bg-red-500",
      change: notSignedUpChange,
      invertColors: true,
    },
    {
      label: "Conversion Rate",
      value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`,
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      border: "border-amber-200",
      glow: "shadow-[inset_0_1px_0_0_rgba(234,179,8,0.15),0_0_20px_-5px_rgba(234,179,8,0.12)]",
      bar: "bg-amber-500",
      change: conversionChange,
      invertColors: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm transition-all ${card.border} ${card.glow}`}
        >
          <div className={`absolute top-0 left-0 right-0 h-1 ${card.bar}`} />
          <CardContent className="p-5 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" />
                ) : (
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
                    {card.change && (
                      <ChangeIndicator pct={card.change.pct} direction={card.change.direction} invertColors={card.invertColors} />
                    )}
                  </div>
                )}
              </div>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
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
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        serviceLine: lead.serviceLine,
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto !bg-white border-l border-gray-200">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-gray-900">
            <Contact className="w-5 h-5 text-gray-600" />
            {lead.name}
          </SheetTitle>
          <SheetDescription className="text-gray-500">
            Created {format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info - Editable */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Contact Information</h4>
            <div className="space-y-2">
              <Label className="text-gray-700">Name</Label>
              <Input
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-700">Phone</Label>
                <Input
                  value={editData.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="555-123-4567"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Email</Label>
                <Input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            {/* Quick actions row */}
            <div className="flex items-center gap-3 pt-1">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
              )}
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {lead.contactAttemptsCount} contact{lead.contactAttemptsCount !== 1 ? "s" : ""}
                {lead.lastContactedAt && (
                  <span className="ml-0.5">(last: {format(new Date(lead.lastContactedAt), "MMM d")})</span>
                )}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogContact} className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <Phone className="w-4 h-4 mr-1.5" />
              Log Contact Attempt
            </Button>
          </div>

          {/* Service & Source */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Service & Source</h4>
            <div className="space-y-2">
              <Label className="text-gray-700">Service Line</Label>
              <Select
                value={editData.serviceLine || ""}
                onValueChange={(value) => setEditData({ ...editData, serviceLine: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select service..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LINE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm space-y-1 text-gray-700">
              <p><span className="text-gray-500">Source:</span> {SOURCE_TYPE_LABELS[lead.leadSourceType] || lead.leadSourceType}</p>
              {lead.landingPagePath && (
                <p><span className="text-gray-500">Landing Page:</span> {lead.landingPagePath}</p>
              )}
              {lead.utmSource && (
                <p><span className="text-gray-500">UTM Source:</span> {lead.utmSource}</p>
              )}
              {lead.utmCampaign && (
                <p><span className="text-gray-500">Campaign:</span> {lead.utmCampaign}</p>
              )}
              {lead.utmTerm && (
                <p><span className="text-gray-500">Keyword:</span> {lead.utmTerm}</p>
              )}
            </div>
          </div>

          {/* Status & Outcome */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Status & Outcome</h4>

            <div className="space-y-2">
              <Label className="text-gray-700">Status</Label>
              <Select
                value={editData.leadStatus || lead.leadStatus}
                onValueChange={(value) => setEditData({ ...editData, leadStatus: value })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
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
              <Label className="text-gray-700">Outcome</Label>
              <Select
                value={editData.outcome || lead.outcome}
                onValueChange={(value) => setEditData({ ...editData, outcome: value, noSignupReason: null, signupType: null })}
              >
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
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
                <Label className="text-gray-700">Reason</Label>
                <Select
                  value={editData.noSignupReason || ""}
                  onValueChange={(value) => setEditData({ ...editData, noSignupReason: value })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
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
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                )}
              </div>
            )}

            {/* Conditional: Signed Up Type */}
            {(editData.outcome || lead.outcome) === "signed_up" && (
              <div className="space-y-2">
                <Label className="text-gray-700">Signup Type</Label>
                <Select
                  value={editData.signupType || ""}
                  onValueChange={(value) => setEditData({ ...editData, signupType: value })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
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
            <Label className="text-gray-700">Notes</Label>
            <Textarea
              value={editData.notes || ""}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={4}
              placeholder="Add notes about this lead..."
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete lead"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
            <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100" onClick={() => onOpenChange(false)}>
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

  // Filter state - default to all time so historical data is visible
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    outcome: "all",
    serviceLine: "all",
    month: "all",
  });

  // Generate month options for the last 24 months to cover all historical data
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
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

    // Load all leads at once (grouped by month in UI)
    params.limit = "10000";

    return params;
  }, [filters]);

  // Queries with longer stale times for smoother navigation
  const { data: leadsData, isLoading: leadsLoading, isFetching: leadsFetching, refetch: refetchLeads } = useQuery({
    queryKey: ["leads", siteId, queryParams],
    queryFn: () => fetchLeads(siteId!, queryParams),
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Compute date ranges for stats (current period + previous period for comparison)
  const { statsStartDate, statsEndDate, prevStartDate, prevEndDate, hasMonthFilter } = useMemo(() => {
    if (filters.month && filters.month !== "all") {
      const [year, month] = filters.month.split("-").map(Number);
      const current = new Date(year, month - 1);
      const prev = subMonths(current, 1);
      return {
        statsStartDate: startOfMonth(current).toISOString(),
        statsEndDate: endOfMonth(current).toISOString(),
        prevStartDate: startOfMonth(prev).toISOString(),
        prevEndDate: endOfMonth(prev).toISOString(),
        hasMonthFilter: true,
      };
    }
    return { statsStartDate: undefined, statsEndDate: undefined, prevStartDate: undefined, prevEndDate: undefined, hasMonthFilter: false };
  }, [filters.month]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["leads-stats", siteId, statsStartDate, statsEndDate],
    queryFn: () => fetchLeadStats(siteId!, statsStartDate, statsEndDate),
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: prevStats } = useQuery({
    queryKey: ["leads-stats", siteId, prevStartDate, prevEndDate],
    queryFn: () => fetchLeadStats(siteId!, prevStartDate, prevEndDate),
    enabled: !!siteId && hasMonthFilter,
    staleTime: 5 * 60 * 1000,
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
          <Contact className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Site Selected</h2>
          <p className="text-gray-500">Please select a website to view leads.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500">Track and manage incoming leads</p>
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
          <TabsList className="bg-gray-100 border border-gray-200">
            <TabsTrigger value="leads" className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
              <List className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <LeadsAnalytics siteId={siteId} />
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-6">

        {/* Stat Cards */}
        <StatCards stats={stats} prevStats={prevStats} isLoading={statsLoading} hasPeriodComparison={hasMonthFilter} />

        {/* Filters */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9 bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-[150px] bg-gray-50 border-gray-300 text-gray-900">
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
                <SelectTrigger className="w-[150px] bg-gray-50 border-gray-300 text-gray-900">
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
                <SelectTrigger className="w-[180px] bg-gray-50 border-gray-300 text-gray-900">
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
                <SelectTrigger className="w-[160px] bg-gray-50 border-gray-300 text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
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
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-600 hover:text-gray-900">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-0">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : !leadsData?.leads?.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Contact className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500 mb-4">
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
                  <TableRow className="border-gray-200">
                    <TableHead className="w-[100px] text-gray-600">Created</TableHead>
                    <TableHead className="text-gray-600">Name</TableHead>
                    <TableHead className="text-gray-600">Contact</TableHead>
                    <TableHead className="text-gray-600">Service</TableHead>
                    <TableHead className="text-gray-600">Source</TableHead>
                    <TableHead className="text-gray-600">Status</TableHead>
                    <TableHead className="text-gray-600">Outcome</TableHead>
                    <TableHead className="text-gray-600">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(leadsByMonth).map(([monthKey, monthData]) => (
                    <Fragment key={monthKey}>
                      {/* Month section header */}
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-gray-200">
                        <TableCell colSpan={8} className="py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-gray-900">{monthData.label}</span>
                            <Badge variant="secondary" className="ml-2 bg-purple-50 text-purple-700 border border-purple-200">
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
                            className="cursor-pointer hover:bg-gray-50 border-gray-100"
                            onClick={() => handleRowClick(lead)}
                          >
                            <TableCell className="text-sm text-gray-500">
                              {format(new Date(lead.createdAt), "MMM d")}
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">{lead.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 text-sm">
                                {lead.phone && (
                                  <span className="flex items-center gap-1 text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {lead.phone}
                                  </span>
                                )}
                                {lead.email && (
                                  <span className="flex items-center gap-1 text-gray-600 truncate max-w-[150px]">
                                    <Mail className="w-3 h-3" />
                                    {lead.email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              {SERVICE_LINE_LABELS[lead.serviceLine || ""] || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {SOURCE_TYPE_LABELS[lead.leadSourceType] || lead.leadSourceType}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm text-gray-700">
                                <OutcomeIcon className="w-4 h-4" />
                                {outcomeInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
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
          <p className="text-sm text-gray-500 text-center">
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
