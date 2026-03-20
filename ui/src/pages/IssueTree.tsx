import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { Identity } from "../components/Identity";
import { MarkdownBody } from "../components/MarkdownBody";
import { cn } from "../lib/utils";
import { ChevronDown, ChevronRight, GitBranch, User } from "lucide-react";
import type { Issue, IssueComment } from "@paperclipai/shared";

// ── Left panel: single accordion row ─────────────────────────────────────────

interface RootRowProps {
  root: Issue;
  subtasks: Issue[];
  isExpanded: boolean;
  isSelected: boolean;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function RootRow({
  root,
  subtasks,
  isExpanded,
  isSelected,
  selectedId,
  onToggle,
  onSelect,
}: RootRowProps) {
  const hasSubtasks = subtasks.length > 0;

  return (
    <div>
      {/* Root row — 32 px tall */}
      <button
        className={cn(
          "flex items-center gap-1.5 w-full h-8 px-2 text-left text-[12px] transition-colors",
          isSelected ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50",
        )}
        onClick={() => {
          onSelect(root.id);
          if (hasSubtasks) onToggle(root.id);
        }}
      >
        {hasSubtasks ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <StatusIcon status={root.status} />
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
          {root.identifier ?? root.id.slice(0, 8)}
        </span>
        <span className="truncate">{root.title}</span>
      </button>

      {/* Subtasks — indented with left border line */}
      {isExpanded && hasSubtasks && (
        <div className="ml-4 border-l border-border">
          {subtasks.map((child) => {
            const isChildSelected = selectedId === child.id;
            return (
              <button
                key={child.id}
                className={cn(
                  "flex items-center gap-1.5 w-full h-8 pl-3 pr-2 text-left text-[12px] transition-colors",
                  isChildSelected
                    ? "bg-accent text-foreground"
                    : "text-foreground/70 hover:bg-accent/50",
                )}
                onClick={() => onSelect(child.id)}
              >
                <StatusIcon status={child.status} />
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {child.identifier ?? child.id.slice(0, 8)}
                </span>
                <span className="truncate">{child.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Centre panel: condensed issue detail ──────────────────────────────────────

interface CenterPanelProps {
  issue: Issue | undefined;
  isLoading: boolean;
  comments: IssueComment[] | undefined;
  subtasks: Issue[];
  agentName: (id: string | null | undefined) => string | null;
  onSelectIssue: (id: string) => void;
}

function CenterPanel({
  issue,
  isLoading,
  comments,
  subtasks,
  agentName,
  onSelectIssue,
}: CenterPanelProps) {
  if (!issue && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select a ticket to view details
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-5 w-48 rounded animate-pulse bg-accent/50" />
        <div className="h-4 w-full rounded animate-pulse bg-accent/50" />
        <div className="h-4 w-3/4 rounded animate-pulse bg-accent/50" />
        <div className="h-4 w-5/6 rounded animate-pulse bg-accent/50" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusIcon status={issue.status} />
          <PriorityIcon priority={issue.priority} />
          <span className="text-xs font-mono text-muted-foreground">
            {issue.identifier ?? issue.id.slice(0, 8)}
          </span>
          <Link
            to={`/issues/${issue.identifier ?? issue.id}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Open full view →
          </Link>
        </div>
        <h2 className="text-base font-semibold leading-snug">{issue.title}</h2>
      </div>

      {/* Description */}
      {issue.description && (
        <div>
          <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Description
          </h3>
          <MarkdownBody className="text-sm">{issue.description}</MarkdownBody>
        </div>
      )}

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div>
          <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Subtasks ({subtasks.length})
          </h3>
          <div className="space-y-0.5">
            {subtasks.map((child) => (
              <button
                key={child.id}
                className="flex items-center gap-2 w-full h-8 px-2 text-left hover:bg-accent/50 rounded transition-colors"
                onClick={() => onSelectIssue(child.id)}
              >
                <StatusIcon status={child.status} />
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {child.identifier ?? child.id.slice(0, 8)}
                </span>
                <span className="truncate text-[13px]">{child.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Comments{comments && comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>
        {(!comments || comments.length === 0) && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        <div className="space-y-4">
          {(comments ?? []).map((comment) => {
            const author =
              agentName(comment.authorAgentId) ??
              (comment.authorUserId ? "Board" : "System");
            return (
              <div key={comment.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Identity name={author} size="sm" />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="pl-5">
                  <MarkdownBody className="text-sm">{comment.body}</MarkdownBody>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Right panel: compact properties ──────────────────────────────────────────

interface RightPanelProps {
  issue: Issue | undefined;
  allIssues: Issue[];
  agentName: (id: string | null | undefined) => string | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onSelectIssue: (id: string) => void;
}

function RightPanel({ issue, allIssues, agentName, onUpdate, onSelectIssue }: RightPanelProps) {
  if (!issue) {
    return (
      <p className="text-xs text-muted-foreground p-3">Select a ticket to view properties.</p>
    );
  }

  const parent = issue.parentId ? allIssues.find((i) => i.id === issue.parentId) : null;

  return (
    <div className="p-3 space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Status
        </p>
        <StatusIcon
          status={issue.status}
          onChange={(status) => onUpdate({ status })}
          showLabel
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Priority
        </p>
        <PriorityIcon
          priority={issue.priority}
          onChange={(priority) => onUpdate({ priority })}
          showLabel
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Assignee
        </p>
        {issue.assigneeAgentId ? (
          <Identity
            name={agentName(issue.assigneeAgentId) ?? issue.assigneeAgentId.slice(0, 8)}
            size="sm"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Unassigned</span>
          </div>
        )}
      </div>

      {issue.goalId && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Goal
          </p>
          <Link
            to={`/goals/${issue.goalId}`}
            className="text-xs hover:underline text-foreground/80"
          >
            View goal →
          </Link>
        </div>
      )}

      {parent && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Parent
          </p>
          <button
            className="text-xs hover:underline text-foreground/80 text-left w-full truncate"
            onClick={() => onSelectIssue(parent.id)}
          >
            {[parent.identifier, parent.title].filter(Boolean).join(" ")}
          </button>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Created
        </p>
        <span className="text-xs text-muted-foreground">
          {new Date(issue.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function IssueTree() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Ticket Tree" }]);
  }, [setBreadcrumbs]);

  // All issues
  const { data: allIssues = [], isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Agents for assignee display
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Selected issue detail (richer payload including ancestors)
  const { data: selectedIssue, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.issues.detail(selectedId!),
    queryFn: () => issuesApi.get(selectedId!),
    enabled: !!selectedId,
  });

  // Comments for selected issue
  const { data: comments } = useQuery({
    queryKey: queryKeys.issues.comments(selectedId!),
    queryFn: () => issuesApi.listComments(selectedId!),
    enabled: !!selectedId,
  });

  // Update mutation — captures issueId at call time to avoid stale closure
  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(updated.id) });
    },
  });

  // Build tree — roots + children map
  const { rootIssues, childrenByParent } = useMemo(() => {
    const roots: Issue[] = [];
    const childMap = new Map<string, Issue[]>();
    for (const issue of allIssues) {
      if (!issue.parentId) {
        roots.push(issue);
      } else {
        const existing = childMap.get(issue.parentId) ?? [];
        existing.push(issue);
        childMap.set(issue.parentId, existing);
      }
    }
    return { rootIssues: roots, childrenByParent: childMap };
  }, [allIssues]);

  const agentName = (id: string | null | undefined): string | null => {
    if (!id || !agents) return null;
    const agent = agents.find((a) => a.id === id);
    return agent?.name ?? null;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Select a company to view the ticket tree." />;
  }

  const selectedSubtasks = selectedId ? (childrenByParent.get(selectedId) ?? []) : [];

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left panel (320px) — scrollable accordion ───────────────────── */}
      <aside className="w-80 shrink-0 border-r border-border flex flex-col min-h-0">
        <div className="h-9 flex items-center px-3 border-b border-border shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Issues
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {issuesLoading && (
            <div className="space-y-px p-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 rounded animate-pulse bg-accent/40" />
              ))}
            </div>
          )}
          {!issuesLoading && rootIssues.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4">No issues found.</p>
          )}
          {rootIssues.map((root) => (
            <RootRow
              key={root.id}
              root={root}
              subtasks={childrenByParent.get(root.id) ?? []}
              isExpanded={expanded.has(root.id)}
              isSelected={selectedId === root.id}
              selectedId={selectedId}
              onToggle={toggleExpand}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </aside>

      {/* ── Centre panel (flex-1) — condensed issue detail ──────────────── */}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <CenterPanel
          issue={selectedIssue}
          isLoading={detailLoading}
          comments={comments}
          subtasks={selectedSubtasks}
          agentName={agentName}
          onSelectIssue={setSelectedId}
        />
      </main>

      {/* ── Right panel (240px) — compact properties ─────────────────────── */}
      <aside className="w-60 shrink-0 border-l border-border flex flex-col min-h-0">
        <div className="h-9 flex items-center px-3 border-b border-border shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Properties
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <RightPanel
            issue={selectedIssue}
            allIssues={allIssues}
            agentName={agentName}
            onUpdate={(data) =>
              selectedIssue && updateIssue.mutate({ id: selectedIssue.id, data })
            }
            onSelectIssue={setSelectedId}
          />
        </div>
      </aside>
    </div>
  );
}
