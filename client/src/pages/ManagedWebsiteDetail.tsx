/**
 * Website Detail Page - Manage a specific target website
 * 
 * This page allows users to:
 * - View website details and settings
 * - Edit website settings (competitors, services enabled, notes)
 * - Run different types of jobs
 * - View job history
 */

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft,
  Globe, 
  Play, 
  Save,
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Settings,
  History,
} from "lucide-react";
import { ROUTES } from "@shared/routes";

// ============================================
// Types
// ============================================

interface WebsiteSettings {
  id: number;
  websiteId: string;
  competitors: string[];
  targetServicesEnabled: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebsiteJob {
  id: number;
  jobId: string;
  websiteId: string;
  jobType: string;
  domain: string;
  requestedBy: string;
  traceId: string;
  status: string;
  result: Record<string, any> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface WebsiteDetail {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
  settings: WebsiteSettings | null;
  integrations: any[];
  recentJobs: WebsiteJob[];
}

// ============================================
// Constants
// ============================================

const JOB_TYPES = [
  { value: 'health_check', label: 'Health Check', description: 'Basic site health and availability' },
  { value: 'crawl_technical_seo', label: 'Technical SEO Crawl', description: 'Full technical SEO audit' },
  { value: 'content_audit', label: 'Content Audit', description: 'Analyze content quality and opportunities' },
  { value: 'performance_check', label: 'Performance Check', description: 'Core Web Vitals and speed metrics' },
];

const AVAILABLE_SERVICES = [
  { value: 'health_check', label: 'Health Check' },
  { value: 'crawl_technical_seo', label: 'Technical SEO Crawl' },
  { value: 'content_audit', label: 'Content Audit' },
  { value: 'performance_check', label: 'Performance Check' },
];

// ============================================
// Component
// ============================================

export default function ManagedWebsiteDetail() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [editedName, setEditedName] = useState("");
  const [editedStatus, setEditedStatus] = useState<'active' | 'paused'>('active');
  const [editedCompetitors, setEditedCompetitors] = useState("");
  const [editedServices, setEditedServices] = useState<string[]>([]);
  const [editedNotes, setEditedNotes] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("health_check");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch website details
  const { data: website, isLoading, error } = useQuery<WebsiteDetail>({
    queryKey: ['website', websiteId],
    queryFn: async () => {
      const res = await fetch(`/api/websites/${websiteId}`);
      if (!res.ok) throw new Error('Failed to fetch website');
      return res.json();
    },
  });

  // Initialize form when website data loads
  const [formInitialized, setFormInitialized] = useState(false);
  if (website && !formInitialized) {
    setEditedName(website.name);
    setEditedStatus(website.status);
    setEditedCompetitors(website.settings?.competitors?.join(', ') || '');
    setEditedServices(website.settings?.targetServicesEnabled || []);
    setEditedNotes(website.settings?.notes || '');
    setFormInitialized(true);
  }

  // Update website mutation
  const updateWebsite = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          status: editedStatus,
          settings: {
            competitors: editedCompetitors.split(',').map(s => s.trim()).filter(Boolean),
            targetServicesEnabled: editedServices,
            notes: editedNotes,
          },
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update website');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Website settings have been updated." });
      queryClient.invalidateQueries({ queryKey: ['website', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Run job mutation
  const runJob = useMutation({
    mutationFn: async (jobType: string) => {
      const res = await fetch(`/api/websites/${websiteId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: jobType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run job');
      }
      return res.json();
    },
    onSuccess: (data, jobType) => {
      const jobLabel = JOB_TYPES.find(j => j.value === jobType)?.label || jobType;
      toast({ 
        title: `${jobLabel} started`, 
        description: `Job ID: ${data.job_id.slice(0, 8)}...` 
      });
      queryClient.invalidateQueries({ queryKey: ['website', websiteId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFormChange = () => {
    setHasChanges(true);
  };

  const toggleService = (service: string) => {
    setEditedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
    handleFormChange();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">
            <CheckCircle className="w-3 h-3 mr-1" />Active
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border">
            <Clock className="w-3 h-3 mr-1" />Paused
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-700">Running</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-100 text-yellow-700">Queued</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !website) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Website not found</h2>
          <Link href={ROUTES.OVERVIEW}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Websites
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={ROUTES.OVERVIEW}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{website.name}</h1>
                {getStatusBadge(website.status)}
              </div>
              <a 
                href={`https://${website.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1"
              >
                {website.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <Button 
            onClick={() => updateWebsite.mutate()} 
            disabled={!hasChanges || updateWebsite.isPending}
          >
            {updateWebsite.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Website Settings
                </CardTitle>
                <CardDescription>
                  Configure how Hermes manages this website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Website Name</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => { setEditedName(e.target.value); handleFormChange(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={editedStatus} 
                      onValueChange={(v: 'active' | 'paused') => { setEditedStatus(v); handleFormChange(); }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competitors">Competitors (comma-separated domains)</Label>
                  <Input
                    id="competitors"
                    placeholder="competitor1.com, competitor2.com"
                    value={editedCompetitors}
                    onChange={(e) => { setEditedCompetitors(e.target.value); handleFormChange(); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Enabled Services</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {AVAILABLE_SERVICES.map((service) => (
                      <div 
                        key={service.value}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <span className="text-sm">{service.label}</span>
                        <Switch
                          checked={editedServices.includes(service.value)}
                          onCheckedChange={() => toggleService(service.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this website..."
                    value={editedNotes}
                    onChange={(e) => { setEditedNotes(e.target.value); handleFormChange(); }}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Jobs
                </CardTitle>
                <CardDescription>
                  History of jobs run for this website
                </CardDescription>
              </CardHeader>
              <CardContent>
                {website.recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No jobs have been run yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {website.recentJobs.map((job) => (
                        <TableRow key={job.jobId}>
                          <TableCell className="font-medium">
                            {job.jobType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                          <TableCell className="text-muted-foreground">{job.requestedBy}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(job.completedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions Column */}
          <div className="space-y-6">
            {/* Run Job Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Run Job
                </CardTitle>
                <CardDescription>
                  Publish a job to the worker queue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((job) => (
                        <SelectItem key={job.value} value={job.value}>
                          {job.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {JOB_TYPES.find(j => j.value === selectedJobType)?.description}
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => runJob.mutate(selectedJobType)}
                  disabled={runJob.isPending || website.status === 'paused'}
                >
                  {runJob.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run {JOB_TYPES.find(j => j.value === selectedJobType)?.label}
                </Button>
                {website.status === 'paused' && (
                  <p className="text-xs text-muted-foreground text-center">
                    Website is paused. Set status to Active to run jobs.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(website.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatDate(website.updatedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Jobs</span>
                  <span>{website.recentJobs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Integrations</span>
                  <span>{website.integrations.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
