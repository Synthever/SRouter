import { memo, useMemo, useState } from "react"

import { Badge } from "@/components/arc/badge/badge"
import { SearchField } from "@/components/arc/search-field/search-field"
import type { CatalogModel } from "@/api/types"

/**
 * One row of `PlaygroundModelPicker`: a plain button labeled with the model id,
 * starred when the operator favorites it, badged when Node marks it custom.
 */
const PlaygroundModelRow = memo(function PlaygroundModelRow({
  model,
  selected,
  onSelect,
}: {
  model: CatalogModel
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
        selected ? "bg-foreground/10" : "hover:bg-foreground/5"
      }`}
    >
      <span className="min-w-0 truncate font-mono text-xs text-foreground">
        {model.id}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {model.favorite && <span aria-label="Favorite">★</span>}
        {model.custom && (
          <Badge tone="neutral" size="sm">
            Custom
          </Badge>
        )}
      </span>
    </button>
  )
})

/**
 * Searchable model catalog for the playground. Rows are memoized (`memo`) so a
 * stream that appends a delta only re-renders the one row whose selection
 * state changed — not the whole list on every token.
 */
export function PlaygroundModelPicker({
  models,
  isPending,
  effectiveModel,
  onSelect,
}: {
  models: CatalogModel[]
  isPending: boolean
  effectiveModel: string | null
  onSelect: (id: string) => void
}) {
  const [modelSearch, setModelSearch] = useState("")

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    const favoritesFirst = [...models].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      return a.id.localeCompare(b.id)
    })
    if (!q) return favoritesFirst
    return favoritesFirst.filter(
      (m) => m.id.toLowerCase().includes(q) || m.owned_by.toLowerCase().includes(q)
    )
  }, [models, modelSearch])

  return (
    <>
      <div className="mt-3">
        <SearchField
          label="Search models"
          id="playground-model-filter"
          value={modelSearch}
          onValueChange={setModelSearch}
          placeholder="Filter by id or owner..."
        />
      </div>
      <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
        {isPending ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            Loading catalog…
          </div>
        ) : filteredModels.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No models match. Register one under Providers first.
          </p>
        ) : (
          filteredModels.map((m) => (
            <PlaygroundModelRow
              key={m.id}
              model={m}
              selected={m.id === effectiveModel}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </>
  )
}
