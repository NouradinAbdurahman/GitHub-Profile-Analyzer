"use client"

import { useRepoComparison } from "@/components/repo-comparison-provider"
import { useWindowSize } from "@/app/hooks/useWindowSize"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnimatedComparisonIcon } from "@/components/animated-comparison-icon"

export default function ComparePage() {
  const { comparedRepos, removeRepo, clearRepos } = useRepoComparison()
  const router = useRouter()
  const { width } = useWindowSize()

  // If no repositories are being compared, show a message
  if (comparedRepos.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold max-[530px]:text-lg max-[530px]:font-semibold">Repository Comparison</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="mb-6">
              <AnimatedComparisonIcon />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No repositories to compare</h2>
            <p className="mb-4 text-center text-muted-foreground">
              Add repositories to your comparison list to see how they stack up against each other.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Browse Repositories</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare data for charts
  const starsData = comparedRepos.map((repo) => ({
    name: repo.name,
    stars: repo.stargazers_count || 0,
  }))

  const forksData = comparedRepos.map((repo) => ({
    name: repo.name,
    forks: repo.forks_count || 0,
  }))

  const issuesData = comparedRepos.map((repo) => ({
    name: repo.name,
    issues: repo.open_issues_count || 0,
  }))

  const sizeData = comparedRepos.map((repo) => ({
    name: repo.name,
    size: repo.size ? Math.round(repo.size / 1024) : 0, // Convert KB to MB
  }))

  // Calculate age in days
  const ageData = comparedRepos.map((repo) => {
    if (!repo.created_at) {
      return {
        name: repo.name,
        age: 0,
      }
    }
    const createdDate = new Date(repo.created_at)
    const today = new Date()
    const ageInDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    return {
      name: repo.name,
      age: ageInDays,
    }
  })

  // Calculate update frequency (days between updates)
  const updateFrequencyData = comparedRepos.map((repo) => {
    if (!repo.created_at || !repo.updated_at) {
      return {
        name: repo.name,
        frequency: 0,
      }
    }
    const createdDate = new Date(repo.created_at)
    const updatedDate = new Date(repo.updated_at)
    const ageInDays = Math.floor((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    const updates = Math.max(1, Math.floor(Math.random() * 100)) // Mock data for number of updates
    const frequency = Math.round(ageInDays / updates)
    return {
      name: repo.name,
      frequency,
    }
  })

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold max-[530px]:text-lg max-[530px]:font-semibold">Repository Comparison</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={clearRepos}>
          Clear All
        </Button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {comparedRepos.map((repo) => (
          <Card key={repo.id} className="relative max-[530px]:p-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive max-[530px]:h-6 max-[530px]:w-6"
              onClick={() => removeRepo(repo.id)}
            >
              <Trash2 className="h-4 w-4 max-[530px]:h-3 max-[530px]:w-3" />
              <span className="sr-only">Remove {repo.name}</span>
            </Button>
            <CardHeader className="pb-2 max-[530px]:pb-1">
              <div className="flex items-start gap-2 max-[530px]:gap-1">
                <Avatar className="h-8 w-8 max-[530px]:h-6 max-[530px]:w-6">
                  <AvatarImage src={repo.owner.avatar_url || "/placeholder.svg"} alt={repo.owner.login} />
                  <AvatarFallback>{repo.owner.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base max-[530px]:text-xs">{repo.name}</CardTitle>
                  <CardDescription className="text-xs max-[530px]:text-[10px]">@{repo.owner.login}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-2 pt-0 max-[530px]:pb-1 max-[530px]:pt-0">
              {repo.description && <p className="text-sm line-clamp-2 max-[530px]:text-[10px]">{repo.description}</p>}
              <div className="flex flex-wrap gap-1 max-[530px]:gap-[2px]">
                {repo.language && (
                  <Badge variant="outline" className="text-xs max-[530px]:text-[9px] py-0.5 px-2 max-[530px]:py-0 max-[530px]:px-1">
                    {repo.language}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs max-[530px]:text-[9px] py-0.5 px-2 max-[530px]:py-0 max-[530px]:px-1">
                  ⭐ {repo.stargazers_count}
                </Badge>
                <Badge variant="secondary" className="text-xs max-[530px]:text-[9px] py-0.5 px-2 max-[530px]:py-0 max-[530px]:px-1">
                  🍴 {repo.forks_count}
                </Badge>
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-2 w-full max-[530px]:mt-1 max-[530px]:text-[10px] max-[530px]:h-6">
                <Link href={repo.html_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3 w-3 max-[530px]:h-2 max-[530px]:w-2" />
                  View on GitHub
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="metrics">
        <TabsList className="mb-4 max-[530px]:gap-1 max-[530px]:px-1">
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="details">Detailed Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Stars</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Number of stars per repository</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      stars: {
                        label: "Stars",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={starsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="stars" fill="var(--color-stars)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Forks</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Number of forks per repository</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      forks: {
                        label: "Forks",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forksData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="forks" fill="var(--color-forks)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Open Issues</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Number of open issues per repository</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      issues: {
                        label: "Issues",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuesData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="issues" fill="var(--color-issues)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Repository Size</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Size in MB per repository</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      size: {
                        label: "Size (MB)",
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sizeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="size" fill="var(--color-size)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Repository Age</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Age in days since creation</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      age: {
                        label: "Age (days)",
                        color: "hsl(var(--chart-5))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="age" fill="var(--color-age)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden max-[530px]:p-2">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Update Frequency</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Average days between updates</CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-[530px]:p-1">
                <div className="h-[180px] md:h-[350px] max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      frequency: {
                        label: "Days between updates",
                        color: "hsl(var(--chart-6))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={updateFrequencyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="frequency" fill="var(--color-frequency)" barSize={width && width < 530 ? 6 : 24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 overflow-hidden mt-6 mb-20">
              <CardHeader className="pb-2 max-[530px]:pb-1">
                <CardTitle className="text-2xl max-[530px]:text-base">Metrics Comparison</CardTitle>
                <CardDescription className="text-base max-[530px]:text-xs">Side-by-side comparison of key metrics</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 pb-16 lg:pb-24 max-[530px]:px-1 max-[530px]:pb-4">
                <div className="h-[350px] sm:h-[400px] md:h-[450px] lg:h-[550px] xl:h-[600px] max-w-[1200px] mx-auto max-[530px]:h-[140px] max-[530px]:py-3">
                  <ChartContainer
                    config={{
                      stars: {
                        label: "Stars",
                        color: "hsl(var(--chart-1))",
                      },
                      forks: {
                        label: "Forks",
                        color: "hsl(var(--chart-2))",
                      },
                      issues: {
                        label: "Issues",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      {/* For large screens with few repos, use vertical layout */}
                      {(width && width > 1200 && comparedRepos.length <= 3) ? (
                        <BarChart
                          layout="vertical"
                          data={comparedRepos.map((repo) => ({
                            name: repo.name,
                            stars: repo.stargazers_count || 0,
                            forks: repo.forks_count || 0,
                            issues: repo.open_issues_count || 0,
                          }))}
                          margin={{
                            top: 20,
                            right: 30,
                            left: width && width < 530 ? 60 : 20,
                            bottom: 120
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={width && width < 530 ? 60 : 100}
                            tick={{
                              fontSize: width && width < 530 ? 10 : 12,
                              width: 100
                            }}
                          />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend
                            wrapperStyle={{
                              paddingTop: 20,
                              paddingBottom: 20,
                              fontSize: width && width < 530 ? 10 : 12,
                              marginBottom: 40
                            }}
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                          />
                          <Bar dataKey="stars" fill="var(--color-stars)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="forks" fill="var(--color-forks)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="issues" fill="var(--color-issues)" barSize={width && width < 530 ? 6 : 24} />
                        </BarChart>
                      ) : comparedRepos.length <= 3 ? (
                        <BarChart
                          data={comparedRepos.map((repo) => ({
                            name: repo.name,
                            stars: repo.stargazers_count || 0,
                            forks: repo.forks_count || 0,
                            issues: repo.open_issues_count || 0,
                          }))}
                          margin={{
                            top: 20,
                            right: 30,
                            left: width && width < 530 ? 60 : 20,
                            bottom: comparedRepos.length > 2 ? 100 : 60
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            height={comparedRepos.length > 2 ? 80 : 40}
                            tick={{
                              fontSize: width && width < 530 ? 10 : 12,
                              width: width && width < 530 ? 60 : 100
                            }}
                            textAnchor={comparedRepos.length > 2 ? "end" : "middle"}
                            angle={comparedRepos.length > 2 ? -45 : 0}
                            interval={0}
                          />
                          <YAxis width={50} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend
                            wrapperStyle={{
                              paddingTop: 10,
                              paddingBottom: 10,
                              fontSize: width && width < 530 ? 10 : 12
                            }}
                            layout={width && width < 530 ? 'horizontal' : 'vertical'}
                            verticalAlign="bottom"
                            align="center"
                          />
                          <Bar dataKey="stars" fill="var(--color-stars)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="forks" fill="var(--color-forks)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="issues" fill="var(--color-issues)" barSize={width && width < 530 ? 6 : 24} />
                        </BarChart>
                      ) : (
                        <BarChart
                          layout="vertical"
                          data={comparedRepos.map((repo) => ({
                            name: repo.name,
                            stars: repo.stargazers_count || 0,
                            forks: repo.forks_count || 0,
                            issues: repo.open_issues_count || 0,
                          }))}
                          margin={{
                            top: 20,
                            right: 30,
                            left: width && width < 530 ? 60 : 100,
                            bottom: 60
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={width && width < 530 ? 60 : 100}
                            tick={{
                              fontSize: width && width < 530 ? 10 : 12,
                              width: width && width < 530 ? 60 : 85
                            }}
                          />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend
                            wrapperStyle={{
                              paddingTop: 10,
                              paddingBottom: 10,
                              fontSize: width && width < 530 ? 10 : 12
                            }}
                            layout={width && width < 530 ? 'horizontal' : 'vertical'}
                            verticalAlign="bottom"
                            align="center"
                          />
                          <Bar dataKey="stars" fill="var(--color-stars)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="forks" fill="var(--color-forks)" barSize={width && width < 530 ? 6 : 24} />
                          <Bar dataKey="issues" fill="var(--color-issues)" barSize={width && width < 530 ? 6 : 24} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card className="mb-20 max-[530px]:p-2">
            <CardHeader className="pb-2 max-[530px]:pb-1">
              <CardTitle className="text-2xl max-[530px]:text-base">Detailed Comparison</CardTitle>
              <CardDescription className="text-base max-[530px]:text-xs">Side-by-side comparison of repository details</CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-[530px]:p-1">
              <div className="overflow-x-auto -mx-6 px-6 pb-4 max-[530px]:px-1 max-[530px]:pb-2">
                <Table className="w-full text-base max-[530px]:text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-[530px]:text-xs">Metric</TableHead>
                      {comparedRepos.map((repo) => (
                        <TableHead key={repo.id} className="max-[530px]:text-xs">{repo.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Owner</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.owner.login}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Language</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.language || "N/A"}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Stars</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.stargazers_count ? repo.stargazers_count.toLocaleString() : '0'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Forks</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.forks_count ? repo.forks_count.toLocaleString() : '0'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Open Issues</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.open_issues_count ? repo.open_issues_count.toLocaleString() : '0'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Size</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.size ? (repo.size / 1024).toFixed(2) : '0'} MB</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Created</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Last Updated</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Last Push</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">{repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : 'N/A'}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium max-[530px]:text-xs">Topics</TableCell>
                      {comparedRepos.map((repo) => (
                        <TableCell key={repo.id} className="max-[530px]:text-xs">
                          <div className="flex flex-wrap gap-1">
                            {repo.topics && repo.topics.length > 0 ? (
                              repo.topics.map((topic) => (
                                <Badge key={topic} variant="secondary" className="text-xs max-[530px]:text-[9px]">
                                  {topic}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
