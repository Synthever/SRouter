import { useReducer } from "react"

import { importOAuthToken } from "@/api/providers"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import useClipboard from "@/hooks/useClipboard"

import { parseSessionPayload } from "../session-payload"

type TokenImportMode = "form" | "raw"

type TokenImportState = {
  mode: TokenImportMode
  fileName: string | null
  isDragging: boolean
  rawInput: string
  accessToken: string
  accountID: string
  refreshToken: string
  pending: boolean
}

const initialTokenImportState: TokenImportState = {
  mode: "form",
  fileName: null,
  isDragging: false,
  rawInput: "",
  accessToken: "",
  accountID: "",
  refreshToken: "",
  pending: false,
}

type TokenImportAction =
  | { type: "SET_MODE"; payload: TokenImportMode }
  | { type: "SET_FILE_NAME"; payload: string | null }
  | { type: "SET_IS_DRAGGING"; payload: boolean }
  | { type: "SET_RAW_INPUT"; payload: string }
  | { type: "SET_ACCESS_TOKEN"; payload: string }
  | { type: "SET_ACCOUNT_ID"; payload: string }
  | { type: "SET_REFRESH_TOKEN"; payload: string }
  | { type: "SET_PENDING"; payload: boolean }
  | {
      type: "APPLY_CREDENTIALS"
      payload: {
        accessToken: string
        accountID?: string
        refreshToken?: string
        fileName?: string
      }
    }
  | { type: "CLEAR_FILE" }
  | { type: "RESET_AFTER_IMPORT" }
  | { type: "RESET" }

function tokenImportReducer(
  state: TokenImportState,
  action: TokenImportAction
): TokenImportState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload }
    case "SET_FILE_NAME":
      return { ...state, fileName: action.payload }
    case "SET_IS_DRAGGING":
      return { ...state, isDragging: action.payload }
    case "SET_RAW_INPUT":
      return { ...state, rawInput: action.payload }
    case "SET_ACCESS_TOKEN":
      return { ...state, accessToken: action.payload }
    case "SET_ACCOUNT_ID":
      return { ...state, accountID: action.payload }
    case "SET_REFRESH_TOKEN":
      return { ...state, refreshToken: action.payload }
    case "SET_PENDING":
      return { ...state, pending: action.payload }
    case "APPLY_CREDENTIALS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        accountID: action.payload.accountID ?? state.accountID,
        refreshToken: action.payload.refreshToken ?? state.refreshToken,
        fileName: action.payload.fileName ?? state.fileName,
      }
    case "CLEAR_FILE":
      return {
        ...state,
        fileName: null,
        accessToken: "",
        accountID: "",
        refreshToken: "",
        rawInput: "",
      }
    case "RESET_AFTER_IMPORT":
      return {
        ...state,
        rawInput: "",
        accessToken: "",
        accountID: "",
        refreshToken: "",
        fileName: null,
        pending: false,
      }
    case "RESET":
      return initialTokenImportState
  }
}

type UseTokenImportOptions = {
  providerID: string
  connectionName: string
  onConnectionNameChange: (value: string) => void
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

export default function useTokenImport({
  providerID,
  connectionName,
  onConnectionNameChange,
  onSuccess,
  onOpenChange,
}: UseTokenImportOptions) {
  const [state, dispatch] = useReducer(
    tokenImportReducer,
    initialTokenImportState
  )

  const { paste } = useClipboard()

  const rawParsed = state.rawInput.trim()
    ? parseSessionPayload(state.rawInput)
    : null

  function applySessionText(text: string, source?: string): boolean {
    const extracted = parseSessionPayload(text)
    if (!extracted) {
      toast.error("No valid access token found in JSON or text")
      return false
    }

    dispatch({
      type: "APPLY_CREDENTIALS",
      payload: {
        accessToken: extracted.accessToken,
        accountID: extracted.accountID,
        refreshToken: extracted.refreshToken,
        fileName: source,
      },
    })
    if (extracted.name) onConnectionNameChange(extracted.name)

    toast.success(
      extracted.name
        ? `Loaded credentials for ${extracted.name}`
        : "Credentials extracted successfully!"
    )
    return true
  }

  async function loadFile(file: File) {
    try {
      const text = await file.text()
      dispatch({ type: "SET_RAW_INPUT", payload: text })
      applySessionText(text, file.name)
    } catch {
      toast.error("Failed to read file contents")
    }
  }

  async function pasteRaw() {
    const text = await paste()
    if (text === null) {
      toast.error("Clipboard permission unavailable. Paste manually.")
      return
    }
    if (text.trim()) {
      dispatch({ type: "SET_RAW_INPUT", payload: text.trim() })
      toast.success("Pasted from clipboard")
    }
  }

  function applyRawToForm() {
    const extracted = parseSessionPayload(state.rawInput)
    if (!extracted) {
      toast.error("No valid credentials found to apply")
      return
    }

    dispatch({
      type: "APPLY_CREDENTIALS",
      payload: {
        accessToken: extracted.accessToken,
        accountID: extracted.accountID,
        refreshToken: extracted.refreshToken,
      },
    })
    dispatch({ type: "SET_MODE", payload: "form" })
    if (extracted.name) onConnectionNameChange(extracted.name)
    toast.success("Credentials populated into form fields")
  }

  async function importRaw() {
    const extracted = parseSessionPayload(state.rawInput)
    if (!extracted || !extracted.accessToken.trim()) {
      toast.error("Valid access token is required")
      return
    }

    dispatch({ type: "SET_PENDING", payload: true })
    try {
      await importOAuthToken(providerID, {
        access_token: extracted.accessToken.trim(),
        account_id: extracted.accountID.trim() || undefined,
        refresh_token: extracted.refreshToken.trim() || undefined,
        name: extracted.name.trim() || undefined,
      })
      toast.success("Account connected successfully!")
      onSuccess()
      onOpenChange(false)
      dispatch({ type: "RESET_AFTER_IMPORT" })
      onConnectionNameChange("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import token")
    } finally {
      dispatch({ type: "SET_PENDING", payload: false })
    }
  }

  async function importToken() {
    if (!state.accessToken.trim()) {
      toast.error("Access token is required")
      return
    }

    dispatch({ type: "SET_PENDING", payload: true })
    try {
      await importOAuthToken(providerID, {
        access_token: state.accessToken.trim(),
        account_id: state.accountID.trim() || undefined,
        refresh_token: state.refreshToken.trim() || undefined,
        name: connectionName.trim() || undefined,
      })
      toast.success("Account connected successfully!")
      onSuccess()
      onOpenChange(false)
      dispatch({ type: "RESET_AFTER_IMPORT" })
      onConnectionNameChange("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import token")
    } finally {
      dispatch({ type: "SET_PENDING", payload: false })
    }
  }

  function clearLoadedFile() {
    dispatch({ type: "CLEAR_FILE" })
    onConnectionNameChange("")
  }

  function reset() {
    dispatch({ type: "RESET" })
  }

  return {
    mode: state.mode,
    setMode: (mode: TokenImportMode) =>
      dispatch({ type: "SET_MODE", payload: mode }),
    fileName: state.fileName,
    isDragging: state.isDragging,
    setIsDragging: (isDragging: boolean) =>
      dispatch({ type: "SET_IS_DRAGGING", payload: isDragging }),
    rawInput: state.rawInput,
    setRawInput: (rawInput: string) =>
      dispatch({ type: "SET_RAW_INPUT", payload: rawInput }),
    rawParsed,
    accessToken: state.accessToken,
    setAccessToken: (accessToken: string) =>
      dispatch({ type: "SET_ACCESS_TOKEN", payload: accessToken }),
    accountID: state.accountID,
    accountId: state.accountID,
    setAccountID: (accountID: string) =>
      dispatch({ type: "SET_ACCOUNT_ID", payload: accountID }),
    setAccountId: (accountID: string) =>
      dispatch({ type: "SET_ACCOUNT_ID", payload: accountID }),
    refreshToken: state.refreshToken,
    setRefreshToken: (refreshToken: string) =>
      dispatch({ type: "SET_REFRESH_TOKEN", payload: refreshToken }),
    pending: state.pending,
    applySessionText,
    loadFile,
    pasteRaw,
    applyRawToForm,
    importRaw,
    importToken,
    clearLoadedFile,
    reset,
  }
}
