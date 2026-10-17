import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { modelListQuery } from "@/api/models"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/arc/multi-select/multi-select"
import { Skeleton } from "@/components/arc/skeleton/skeleton"

type ModelAllowlistFieldProps = {
  value: string[]
  onValueChange: (value: string[]) => void
}

/**
 * Extracts a clean category/provider name from model metadata or id prefix.
 * e.g. "openai/gpt-4o" -> "OpenAI", owned_by "anthropic" -> "Anthropic"
 */
function resolveCategory(ownedBy: string, modelId: string): string {
  const source =
    ownedBy || (modelId.includes("/") ? modelId.split("/")[0]! : "General")
  if (!source) return "General"
  return source.charAt(0).toUpperCase() + source.slice(1)
}

/**
 * Clean and compact MultiSelect with autocomplete search and categorized groups,
 * identical across mobile, tablet, and desktop.
 */
export function ModelAllowlistField({
  value,
  onValueChange,
}: ModelAllowlistFieldProps) {
  const { data, isPending, isError, refetch } = useQuery(modelListQuery)

  const options = useMemo<MultiSelectOption[]>(() => {
    const models = data?.data ?? []
    const listedIds = new Set(models.map((m) => m.id))

    const catalogOptions: MultiSelectOption[] = models.map((model) => ({
      value: model.id,
      label: model.id,
      category: resolveCategory(model.owned_by, model.id),
    }))

    const storedOptions: MultiSelectOption[] = value
      .filter((id) => !listedIds.has(id))
      .map((id) => ({
        value: id,
        label: id,
        category: "Custom / Stored",
      }))

    return [...catalogOptions, ...storedOptions]
  }, [data, value])

  async function retry() {
    const result = await refetch()
    if (result.error) throw result.error
  }

  if (isPending) return <Skeleton label="Loading the model catalog" lines={2} />

  if (isError) {
    return (
      <Alert tone="danger" title="Could not load the model catalog">
        <span className="flex flex-col items-start gap-3">
          <span className="break-words">
            The allowlist needs the ids this gateway serves, so it stays closed
            until the catalog answers.
          </span>
          <ActionButton
            label="Retry model catalog"
            pendingLabel="Retrying catalog"
            successLabel="Catalog loaded"
            onAction={retry}
            className="!border-border !bg-surface !text-foreground"
          />
        </span>
      </Alert>
    )
  }

  return (
    <MultiSelect
      label="Allowed models"
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Every model"
      searchPlaceholder="Filter models or providers..."
      description="Empty allows every model in the catalog."
    />
  )
}
