/**
 * Websites Page - Manage target websites that Hermes can orchestrate
 * 
 * This page allows users to:
 * - View all managed websites
 * - Add new websites
 * - Run health checks and other jobs
 * - Navigate to website details
 */

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Globe, 
  Plus, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { buildRoute } from "@shared/routes";

// ============================================
// Types
// ============================================

interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
  lastJob?: {
    jobId: string;
    jobType: string;
    status: string;
    createdAt: string;
  } | null;
}

interface CreateWebsitePayload {
  name: string;
  domain: string;
}

// ============================================
// Component
// ============================================

export default function Websites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState("");
  const [newWebsiteDomain, setNewWebsiteDomain] = useState("");

  // Fetch websites
  const { data: websites, isLoading, error } = useQuery<Website[]>({
    queryKey: ['websites'],
    queryFn: async () => {
      const res = await fetch('/api/websites');
      if (!res.ok) throw new Error('Failed to fetch websites');
      return res.json();
    },
  });

  // Create website mutation
  const createWebsite = useMutation({
    mutationFn: async (data: CreateWebsitePayload) => {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create website');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Website added", description: "The website has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setAddDialogOpen(false);
      setNewWebsiteName("");
      setNewWebsiteDomain("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Run health check mutation
  const runHealthCheck = useMutation({
    mutationFn: async (websiteId: string) => {
      const res = await fetch(`/api/websites/${websiteId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: 'health_check' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run health check');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Health check started", 
        description: `Job ID: ${data.job_id.slice(0, 8)}...` 
      });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddWebsite = () => {
    if (!newWebsiteName.trim() || !newWebsiteDomain.trim()) {
      toast({ title: "Validation error", description: "Name and domain are required", variant: "destructive" });
      return;
    }
    createWebsite.mutate({ name: newWebsiteName.trim(), domain: newWebsiteDomain.trim() });
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
    if (!date) return "Never";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Managed Websites</h1>
            <p className="text-muted-foreground">
              Target websites that Hermes can orchestrate and optimize
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Website
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Managed Website</DialogTitle>
                <DialogDescription>
                  Add a target website that Hermes will manage and optimize.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Website Name</Label>
                  <Input
                    id="name"
                    placeholder="Empathy Health Clinic"
                    value={newWebsiteName}
                    onChange={(e) => setNewWebsiteName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    placeholder="empathyhealthclinic.com"
                    value={newWebsiteDomain}
                    onChange={(e) => setNewWebsiteDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the domain without http:// or https://
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddWebsite} 
                  disabled={createWebsite.isPending}
                >
                  {createWebsite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Website
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{websites?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Websites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-semantic-success-soft flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-semantic-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {websites?.filter(w => w.status === 'active').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-semantic-warning-soft flex items-center justify-center">
                  <Clock className="w-6 h-6 text-semantic-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {websites?.filter(w => w.status === 'paused').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Paused</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Websites Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Websites</CardTitle>
            <CardDescription>
              Click on a website to view details and configure settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                <AlertCircle className="w-5 h-5 mr-2" />
                Failed to load websites
              </div>
            ) : websites?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first managed website to get started
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Website
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Website</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Job</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websites?.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell>
                        <Link href={buildRoute.websiteDetail(String(website.id))}>
                          <span className="font-medium hover:underline cursor-pointer">
                            {website.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`https://${website.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          {website.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(website.status)}</TableCell>
                      <TableCell>
                        {website.lastJob ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{website.lastJob.jobType.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                              {getJobStatusBadge(website.lastJob.status)}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(website.lastJob.createdAt)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No jobs run</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runHealthCheck.mutate(website.id)}
                          disabled={runHealthCheck.isPending || website.status === 'paused'}
                        >
                          {runHealthCheck.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-1" />
                          )}
                          Run Health Check
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
