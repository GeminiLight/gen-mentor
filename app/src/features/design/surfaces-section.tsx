"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const rows = [
  { skill: "Python Programming", required: "intermediate", current: "beginner", confidence: "high" },
  { skill: "SQL", required: "advanced", current: "beginner", confidence: "high" },
  { skill: "Statistics & Probability", required: "intermediate", current: "unlearned", confidence: "medium" },
  { skill: "Data Visualization", required: "intermediate", current: "intermediate", confidence: "high" },
];

export function SurfacesSection() {
  return (
    <section className="space-y-10" aria-labelledby="surfaces">
      <h2 id="surfaces" className="text-lg font-semibold">
        Surfaces
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Session 2 · Working with Pandas DataFrames</CardTitle>
            <CardDescription>Load tabular data, inspect it, select and filter rows and columns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mastery</span>
              <span className="num font-medium">64%</span>
            </div>
            <Progress value={64} aria-label="Mastery 64%" />
          </CardContent>
          <CardFooter>
            <Button size="sm">Continue</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Every async boundary shows shape, never a spinner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3" data-loading="">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Empty</CardTitle>
            <CardDescription>No sessions yet.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Set a goal and GenMentor will schedule the first path from your skill gap.</CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              Set a goal
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="gap" className="w-full">
        <TabsList>
          <TabsTrigger value="gap">Skill gap</TabsTrigger>
          <TabsTrigger value="path">Path</TabsTrigger>
          <TabsTrigger value="notes" disabled>
            Notes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gap" className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Current</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.skill}>
                  <TableCell className="font-medium">{r.skill}</TableCell>
                  <TableCell>{r.required}</TableCell>
                  <TableCell className={r.current === r.required ? "text-success" : ""}>{r.current}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.confidence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="path" className="pt-4 text-sm text-muted-foreground">
          Four sessions, foundational to advanced.
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule the path?</DialogTitle>
              <DialogDescription>Learned sessions stay exactly as they are. Only the remaining sessions are regenerated from your updated profile.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button>Reschedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>AI tutor</SheetTitle>
              <SheetDescription>Ask about anything in this session. Replies stream in as they are written.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">Tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Confidence reflects how sure the model is about the current level.</TooltipContent>
        </Tooltip>
      </div>
    </section>
  );
}
