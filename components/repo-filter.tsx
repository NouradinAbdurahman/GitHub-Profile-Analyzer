"use client"

import { useState } from "react"
import { ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Common programming languages with their associated colors
const languages = [
  { name: "JavaScript", color: "#f1e05a" },
  { name: "TypeScript", color: "#2b7489" },
  { name: "Python", color: "#3572A5" },
  { name: "Java", color: "#b07219" },
  { name: "C#", color: "#178600" },
  { name: "PHP", color: "#4F5D95" },
  { name: "Go", color: "#00ADD8" },
  { name: "Ruby", color: "#701516" },
  { name: "Swift", color: "#ffac45" },
  { name: "Kotlin", color: "#A97BFF" },
  { name: "Rust", color: "#dea584" },
  { name: "HTML", color: "#e34c26" },
  { name: "CSS", color: "#563d7c" },
]

// Sort options
const sortOptions = [
  { value: "updated", label: "Last updated" },
  { value: "stars", label: "Stars" },
  { value: "forks", label: "Forks" },
  { value: "name", label: "Name" },
  { value: "created", label: "Created date" },
]

export type RepoFilters = {
  languages: string[]
  minStars: number
  sort: string
  order: "asc" | "desc"
}

type RepoFilterProps = {
  filters: RepoFilters
  onFilterChange: (filters: RepoFilters) => void
  onReset: () => void
}

export function RepoFilter({ filters, onFilterChange, onReset }: RepoFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Count active filters (excluding sort which is always active)
  const activeFilterCount = filters.languages.length + (filters.minStars > 0 ? 1 : 0)

  const handleLanguageToggle = (language: string) => {
    const newLanguages = filters.languages.includes(language)
      ? filters.languages.filter((l) => l !== language)
      : [...filters.languages, language]

    onFilterChange({
      ...filters,
      languages: newLanguages,
    })
  }

  const handleStarsChange = (value: number[]) => {
    onFilterChange({
      ...filters,
      minStars: value[0],
    })
  }

  const handleSortChange = (value: string) => {
    onFilterChange({
      ...filters,
      sort: value,
    })
  }

  const handleOrderToggle = () => {
    onFilterChange({
      ...filters,
      order: filters.order === "desc" ? "asc" : "desc",
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-4" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Languages</h4>
              <div className="flex flex-wrap gap-2">
                {languages.map((language) => (
                  <Badge
                    key={language.name}
                    variant={filters.languages.includes(language.name) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: filters.languages.includes(language.name) ? language.color : undefined,
                      color: filters.languages.includes(language.name) ? "#fff" : undefined,
                      borderColor: !filters.languages.includes(language.name) ? language.color : undefined,
                    }}
                    onClick={() => handleLanguageToggle(language.name)}
                  >
                    {language.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Minimum Stars</h4>
                <span className="text-xs text-muted-foreground">{filters.minStars}</span>
              </div>
              <Slider defaultValue={[filters.minStars]} max={1000} step={10} onValueChange={handleStarsChange} />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={onReset}>
                Reset
              </Button>
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <span>Sort: {sortOptions.find((option) => option.value === filters.sort)?.label}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.sort === option.value}
              onCheckedChange={() => handleSortChange(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={filters.order === "desc"} onCheckedChange={handleOrderToggle}>
            Descending order
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
