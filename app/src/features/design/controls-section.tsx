"use client";

import { ArrowRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;

export function ControlsSection() {
  return (
    <section className="space-y-10" aria-labelledby="controls">
      <h2 id="controls" className="text-lg font-semibold">
        Controls
      </h2>

      <div className="space-y-3">
        <p className="eyebrow">Button · variants</p>
        <div className="flex flex-wrap items-center gap-3">
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
        <p className="eyebrow pt-2">Button · sizes and states</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">
            Large <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
          <Button size="icon" aria-label="Add">
            <Plus aria-hidden />
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" aria-invalid>
            Invalid
          </Button>
          <Button variant="secondary" onClick={() => toast.success("Session 2 marked as learned", { description: "Mastery of Python Programming moved to intermediate." })}>
            Toast
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="d-goal">Learning goal</Label>
          <Input id="d-goal" placeholder="Move into a junior data scientist role within a year" />
          <p className="text-xs text-muted-foreground">Be concrete about the role or outcome. Timeframes help.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-invalid">With an error</Label>
          <Input id="d-invalid" aria-invalid defaultValue="learn stuff" aria-describedby="d-invalid-msg" />
          <p id="d-invalid-msg" className="text-xs text-destructive">
            Too vague to map to skills. Name the role, domain or tool.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-search">With an icon</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="d-search" className="pl-8" placeholder="Search sessions" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-level">Select</Label>
          <Select defaultValue="intermediate">
            <SelectTrigger id="d-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unlearned">Unlearned</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="d-bg">Textarea</Label>
          <Textarea id="d-bg" rows={3} placeholder="Paste your background, or upload a résumé on the next step." />
        </div>
      </div>

      <div className="space-y-3">
        <p className="eyebrow">Badge</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline" className="border-success/40 bg-success-soft text-success">
            Learned
          </Badge>
          <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">
            Needs practice
          </Badge>
          <Badge variant="outline" className="text-kt-foundational">
            foundational
          </Badge>
          <Badge variant="outline" className="text-kt-practical">
            practical
          </Badge>
          <Badge variant="outline" className="text-kt-strategic">
            strategic
          </Badge>
        </div>
      </div>
    </section>
  );
}
