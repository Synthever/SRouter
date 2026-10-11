"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
} from "motion/react"
import type {
  HTMLMotionProps,
  MotionProps,
  TargetAndTransition,
  Transition,
} from "motion/react"
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react"
import { motionTokens } from "../lib/motion-tokens"
import styles from "./toast-stack.module.css"

export type ToastType = "success" | "info" | "warning" | "error" | "loading"

export interface ToastAction {
  label: string
  /** Runs the action. The toast closes afterwards unless the handler updates it. */
  onClick: (id: string) => void
}

export interface ToastOptions {
  /** Reuse an id to update a toast in place instead of stacking a new one. */
  id?: string
  type?: ToastType
  title: string
  description?: string
  action?: ToastAction
  /** Milliseconds before the toast closes itself. Defaults by type; loading toasts wait for an update. Pass Infinity to keep it until closed. */
  duration?: number
}

export interface ToastStackApi {
  /** Shows a toast and returns its id. */
  toast: (options: ToastOptions) => string
  /** Morphs a toast in place: icon, copy, and height animate to the new content and its timer restarts. */
  update: (id: string, patch: Partial<Omit<ToastOptions, "id">>) => void
  /** Dismisses one toast, or every toast when called without an id. */
  dismiss: (id?: string) => void
}

export interface ToastStackProviderProps {
  children: ReactNode
  /** Base lifetime in milliseconds. Warnings and errors stay 1.6 times longer. */
  duration?: number
  /** Oldest toasts beyond this count are dropped from the queue. */
  limit?: number
}

export type ToastPosition =
  | "top-right"
  | "top-center"
  | "top-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left"

export interface ToastStackProps {
  /** Accessible name of the notification region. */
  label?: string
  position?: ToastPosition
  /** Pins the stack inside the nearest positioned ancestor instead of the window. */
  contained?: boolean
  /** How many toasts show at once. Older ones wait behind. */
  visibleToasts?: number
  /** Alt+T moves focus into the stack. */
  hotkey?: boolean
  className?: string
}

type ToastRecord = {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: ToastAction
  duration: number
  seq: number
  version: number
}

type ToastStore = ToastStackApi & {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => ToastRecord[]
  runAction: (id: string) => void
}

type Target = {
  y: number
  scale: number
  height: number
  opacity: number
  content: number
}

/** Each tucked toast shows this many pixels above or below the one in front of it. */
const PEEK = 14
/** Space between toasts when the stack is open. */
const GAP = 12
/** Tucked toasts shrink by this much per step back. */
const STEP = 0.05
/** The card's top and bottom borders, added to the measured content height. */
const BORDER = 2
/** A swipe this far right has faded most of the way out. */
const SWIPE_FADE = 280
const EMPTY: ToastRecord[] = []
const typeLabels: Record<ToastType, string> = {
  success: "Success",
  info: "Info",
  warning: "Warning",
  error: "Error",
  loading: "In progress",
}
const icons = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
}

const standard = [...motionTokens.ease.standard] as [
  number,
  number,
  number,
  number,
]
const enterEase = [...motionTokens.ease.enter] as [
  number,
  number,
  number,
  number,
]
const fade: Transition = {
  duration: motionTokens.duration.fast,
  ease: standard,
}
const enterFade: Transition = {
  duration: motionTokens.duration.standard,
  ease: enterEase,
}
const reducedFade: Transition = {
  duration: motionTokens.duration.fast,
  ease: standard,
}
const exitFast: Transition = {
  duration: motionTokens.duration.fast,
  ease: standard,
}
const textIn: TargetAndTransition = {
  opacity: 0,
  y: "0.3em",
  filter: `blur(${motionTokens.blur.soft}px)`,
}
const textOut: TargetAndTransition = {
  opacity: 0,
  y: "-0.3em",
  filter: `blur(${motionTokens.blur.subtle}px)`,
  transition: exitFast,
}
const iconIn: TargetAndTransition = {
  opacity: 0,
  scale: 0.6,
  filter: `blur(${motionTokens.blur.subtle}px)`,
}
const shown: TargetAndTransition = {
  opacity: 1,
  y: "0em",
  scale: 1,
  filter: "blur(0px)",
}
const fadeOnly: MotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: reducedFade },
  transition: reducedFade,
}
const textSwap: MotionProps = {
  initial: textIn,
  animate: shown,
  exit: textOut,
  transition: { duration: motionTokens.duration.standard, ease: enterEase },
}
const iconSwap: MotionProps = {
  initial: iconIn,
  animate: shown,
  exit: { ...iconIn, transition: exitFast },
  transition: { ...motionTokens.spring.snappy, opacity: fade, filter: fade },
}

const durationFor = (type: ToastType, base: number) =>
  type === "loading"
    ? Number.POSITIVE_INFINITY
    : type === "warning" || type === "error"
      ? base * 1.6
      : base

const project = (velocity: number) => ((velocity / 1000) * 0.99) / (1 - 0.99)
const rubberBand = (distance: number, dimension: number) =>
  (1 - 1 / ((distance * 0.55) / dimension + 1)) * dimension
const subscribeVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener)
  return () => document.removeEventListener("visibilitychange", listener)
}
const getServerSnapshot = () => EMPTY
const focusVisible = (element: Element) => {
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

let activeStore: ToastStore | null = null

function layoutStack(
  toasts: ToastRecord[],
  heights: Record<string, number>,
  expanded: boolean,
  visibleToasts: number,
  isTop: boolean
) {
  const dir = isTop ? 1 : -1
  const front = toasts.length ? (heights[toasts[0]!.id] ?? 0) : 0
  const tops = toasts.reduce<number[]>(
    (sum, item, index) => [
      ...sum,
      sum[index]! + (index < visibleToasts ? (heights[item.id] ?? 0) + GAP : 0),
    ],
    [0]
  )
  const targets = toasts.map((item, index): Target => {
    const visible = index < visibleToasts
    const depth = Math.min(index, visibleToasts)
    return expanded
      ? {
          y: dir * tops[index]!,
          scale: 1,
          height: heights[item.id] ?? 0,
          opacity: visible ? 1 : 0,
          content: 1,
        }
      : {
          y: dir * PEEK * depth,
          scale: 1 - STEP * depth,
          height: index === 0 ? (heights[item.id] ?? 0) : front,
          opacity: visible ? 1 : 0,
          content: index === 0 ? 1 : 0,
        }
  })
  const listHeight = !toasts.length
    ? 0
    : expanded
      ? tops[toasts.length]! - GAP
      : front + PEEK * (Math.min(toasts.length, visibleToasts) - 1)
  return { targets, listHeight }
}

function createToastStore(base: number, limit: number): ToastStore {
  let toasts: ToastRecord[] = []
  let seq = 0
  const listeners = new Set<() => void>()
  const commit = (next: ToastRecord[]) => {
    toasts = next
    listeners.forEach((listener) => listener())
  }
  const update: ToastStackApi["update"] = (id, patch) => {
    const found = toasts.find((item) => item.id === id)
    if (!found) return
    const type = patch.type ?? found.type
    const record: ToastRecord = {
      ...found,
      ...patch,
      type,
      duration: patch.duration ?? durationFor(type, base),
      version: found.version + 1,
    }
    commit(toasts.map((item) => (item.id === id ? record : item)))
  }
  const toastMethod: ToastStackApi["toast"] = ({ id, ...options }) => {
    if (id && toasts.some((item) => item.id === id)) {
      update(id, options)
      return id
    }
    const type = options.type ?? "info"
    seq += 1
    const record: ToastRecord = {
      ...options,
      id: id ?? `toast-${seq}`,
      type,
      duration: options.duration ?? durationFor(type, base),
      seq,
      version: 0,
    }
    commit([record, ...toasts].slice(0, limit))
    return record.id
  }
  const dismiss: ToastStackApi["dismiss"] = (id) => {
    if (id === undefined) {
      if (toasts.length) commit([])
      return
    }
    if (toasts.some((item) => item.id === id))
      commit(toasts.filter((item) => item.id !== id))
  }
  const runAction = (id: string) => {
    const found = toasts.find((item) => item.id === id)
    if (!found?.action) return
    found.action.onClick(id)
    if (toasts.find((item) => item.id === id)?.version === found.version)
      dismiss(id)
  }
  return {
    toast: toastMethod,
    update,
    dismiss,
    runAction,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => toasts,
  }
}

const ToastStackContext = createContext<ToastStore | null>(null)

function useStore() {
  const store = useContext(ToastStackContext)
  if (!store)
    throw new Error("Render toast stack consumers inside <ToastStackProvider>.")
  return store
}

/** Scopes a toast queue to its subtree. Mounted once at root layout. */
export function ToastStackProvider({
  children,
  duration = 5000,
  limit = 12,
}: ToastStackProviderProps) {
  const [store] = useState(() => createToastStore(duration, limit))
  useEffect(() => {
    activeStore = store
    return () => {
      if (activeStore === store) activeStore = null
    }
  }, [store])
  return (
    <ToastStackContext.Provider value={store}>
      {children}
    </ToastStackContext.Provider>
  )
}

/** Shows, updates, and dismisses toasts from anywhere inside the provider. */
export function useToastStack(): ToastStackApi & { count: number } {
  const store = useStore()
  const count = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().length,
    () => 0
  )
  return {
    toast: store.toast,
    update: store.update,
    dismiss: store.dismiss,
    count,
  }
}

/**
 * Global standalone toast API callable anywhere across the application.
 */
export const toast = {
  success: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "success" }) ?? "",
  error: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "error" }) ?? "",
  warning: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "warning" }) ?? "",
  info: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "info" }) ?? "",
  loading: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "loading" }) ?? "",
  progress: (title: string, options?: Omit<ToastOptions, "title" | "type">) =>
    activeStore?.toast({ ...options, title, type: "loading" }) ?? "",
  dismiss: (id?: string) => activeStore?.dismiss(id),
  update: (id: string, patch: Partial<Omit<ToastOptions, "id">>) =>
    activeStore?.update(id, patch),
}

function Swap(props: HTMLMotionProps<"span">) {
  const present = useIsPresent()
  return (
    <motion.span
      {...props}
      aria-hidden={present ? props["aria-hidden"] : true}
    />
  )
}

type Gesture = {
  pointerId: number
  startX: number
  startY: number
  origin: number
  active: boolean
  samples: { t: number; x: number }[]
}

interface ToastItemProps {
  toast: ToastRecord
  target: Target
  expanded: boolean
  front: boolean
  hidden: boolean
  paused: boolean
  reduce: boolean
  isTop: boolean
  store: ToastStore
  onMeasure: (id: string, height: number) => void
  onDragChange: (dragging: boolean) => void
  onTap: () => void
  onHandOff: (leaving: HTMLElement, keyboard: boolean) => void
}

function ToastItem({
  toast: record,
  target,
  expanded,
  front,
  hidden,
  paused,
  reduce,
  isTop,
  store,
  onMeasure,
  onDragChange,
  onTap,
  onHandOff,
}: ToastItemProps) {
  const { id } = record
  const dir = isTop ? 1 : -1
  const [isPresent, safeToRemove] = usePresence()
  const itemRef = useRef<HTMLLIElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const height = useMotionValue(0)
  const opacity = useMotionValue(0)
  const contentOpacity = useMotionValue(1)
  const x = useMotionValue(0)
  const swipeFade = useTransform(x, (value) =>
    value > 0 ? 1 - Math.min(value / SWIPE_FADE, 1) * 0.75 : 1
  )
  const applied = useRef<boolean | null>(null)
  const swiped = useRef(false)
  const remaining = useRef(record.duration)
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const pointerType = useRef("mouse")

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return
    onMeasure(id, node.offsetHeight + BORDER)
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() =>
      onMeasure(id, node.offsetHeight + BORDER)
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [id, onMeasure])

  useLayoutEffect(() => {
    if (!isPresent || target.height <= 0) return
    const entering = applied.current === null
    const morph = !entering && applied.current !== expanded
    applied.current = expanded
    if (reduce) {
      y.jump(target.y)
      scale.jump(target.scale)
      height.jump(target.height)
      animate(opacity, target.opacity, reducedFade)
      animate(contentOpacity, target.content, reducedFade)
      return
    }
    if (entering) {
      y.jump(target.y - dir * target.height)
      scale.jump(target.scale)
      height.jump(target.height)
      contentOpacity.jump(target.content)
      opacity.jump(0)
    }
    const spring = morph
      ? motionTokens.spring.morph
      : motionTokens.spring.smooth
    animate(y, target.y, spring)
    animate(scale, target.scale, spring)
    if (!entering) animate(height, target.height, spring)
    animate(opacity, target.opacity, entering ? enterFade : fade)
    animate(contentOpacity, target.content, fade)
  }, [
    contentOpacity,
    dir,
    expanded,
    height,
    isPresent,
    opacity,
    reduce,
    scale,
    target.content,
    target.height,
    target.opacity,
    target.scale,
    target.y,
    y,
  ])

  useEffect(() => {
    remaining.current = record.duration
  }, [record.version, record.duration])

  useEffect(() => {
    if (
      !isPresent ||
      paused ||
      !Number.isFinite(remaining.current) ||
      record.duration <= 0
    )
      return
    const started = performance.now()
    const timer = window.setTimeout(
      () => store.dismiss(id),
      Math.max(remaining.current, 0)
    )
    return () => {
      window.clearTimeout(timer)
      remaining.current -= performance.now() - started
    }
  }, [id, isPresent, paused, store, record.version, record.duration])

  useEffect(() => {
    if (isPresent) return
    const node = itemRef.current
    if (node) {
      const active = document.activeElement
      if (active instanceof HTMLElement && node.contains(active))
        onHandOff(node, focusVisible(active))
      node.setAttribute("inert", "")
    }
    const done = () => safeToRemove?.()
    if (reduce) {
      animate(opacity, 0, reducedFade).then(done)
      return
    }
    if (!swiped.current) {
      animate(y, y.get() - dir * 10, motionTokens.spring.smooth)
      animate(scale, scale.get() * 0.96, motionTokens.spring.smooth)
    }
    animate(opacity, 0, {
      duration: swiped.current ? 0.22 : motionTokens.duration.exit,
      ease: standard,
    }).then(done)
  }, [dir, isPresent, onHandOff, opacity, reduce, safeToRemove, scale, y])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerType.current = event.pointerType
    suppressClick.current = false
    if (
      event.button !== 0 ||
      !isPresent ||
      (event.target as Element).closest("button, a")
    )
      return
    x.stop()
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: x.get(),
      active: false,
      samples: [],
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    if (!current.active) {
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      if (Math.hypot(dx, dy) < 6) return
      if (Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null
        return
      }
      current.active = true
      current.startX = event.clientX
      suppressClick.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.dataset.dragging = ""
      window.getSelection()?.removeAllRanges()
      onDragChange(true)
    }
    const raw = current.origin + event.clientX - current.startX
    x.set(raw >= 0 ? raw : -rubberBand(-raw, event.currentTarget.offsetWidth))
    current.samples.push({ t: event.timeStamp, x: raw })
    while (
      current.samples.length > 2 &&
      event.timeStamp - current.samples[0]!.t > 100
    )
      current.samples.shift()
  }

  function onPointerEnd(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean
  ) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    if (!current.active) return
    delete event.currentTarget.dataset.dragging
    onDragChange(false)
    const first = current.samples[0]
    const last = current.samples[current.samples.length - 1]
    const velocity =
      cancelled ||
      !first ||
      !last ||
      last.t === first.t ||
      event.timeStamp - last.t > 60
        ? 0
        : ((last.x - first.x) / (last.t - first.t)) * 1000
    const width = event.currentTarget.offsetWidth
    const offset = x.get()
    if (
      !cancelled &&
      offset > 0 &&
      velocity > -200 &&
      offset + project(velocity) > width * 0.4
    ) {
      swiped.current = true
      if (!reduce)
        animate(x, width + 40, {
          type: "spring",
          visualDuration: 0.32,
          bounce: 0,
          velocity: Math.max(velocity, 0),
        })
      store.dismiss(id)
      return
    }
    if (reduce) x.jump(0)
    else
      animate(x, 0, {
        ...motionTokens.spring.snappy,
        velocity: offset < 0 ? velocity * 0.3 : velocity,
      })
  }

  function onCardClick(event: MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (
      pointerType.current !== "mouse" &&
      !(event.target as Element).closest("button, a")
    )
      onTap()
  }

  function runAction(event: MouseEvent<HTMLButtonElement>) {
    const keyboard = focusVisible(event.currentTarget)
    store.runAction(id)
    if (keyboard && !store.getSnapshot().find((item) => item.id === id)?.action)
      closeRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key !== "Escape") return
    event.stopPropagation()
    store.dismiss(id)
  }

  const markMoving = (moving: boolean) => {
    if (actionRef.current)
      actionRef.current.dataset.moving = moving ? "true" : "false"
  }
  const Icon = record.type === "loading" ? null : icons[record.type]
  const swap = reduce ? fadeOnly : textSwap

  return (
    <motion.li
      ref={itemRef}
      className={[
        styles.item,
        isTop ? styles["item-top"] : styles["item-bottom"],
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ y, scale, height, opacity, zIndex: record.seq }}
      data-front={front}
      data-expanded={expanded}
      inert={hidden}
      onKeyDown={onKeyDown}
    >
      <motion.div
        ref={cardRef}
        className={styles.card}
        style={{ x, opacity: swipeFade }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => onPointerEnd(event, false)}
        onPointerCancel={(event) => onPointerEnd(event, true)}
        onClick={onCardClick}
      >
        <motion.div
          ref={contentRef}
          className={styles.content}
          style={{ opacity: contentOpacity }}
        >
          <span
            className={styles.icon}
            data-type={record.type}
            aria-hidden="true"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <Swap
                key={record.type}
                className={styles.glyph}
                {...(reduce ? fadeOnly : iconSwap)}
              >
                {Icon ? (
                  <Icon width={18} height={18} strokeWidth={1.75} />
                ) : (
                  <span className={styles.spinner} />
                )}
              </Swap>
            </AnimatePresence>
          </span>
          <div className={styles.copy}>
            <span className={styles.srOnly}>{typeLabels[record.type]}: </span>
            <span className={styles.title}>
              <AnimatePresence mode="popLayout" initial={false}>
                <Swap key={record.title} className={styles.line} {...swap}>
                  {record.title}
                </Swap>
              </AnimatePresence>
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              {record.description ? (
                <Swap
                  key={record.description}
                  className={styles.description}
                  {...swap}
                >
                  {record.description}
                </Swap>
              ) : null}
            </AnimatePresence>
          </div>
          <AnimatePresence initial={false}>
            {record.action ? (
              <motion.div
                key="action"
                ref={actionRef}
                className={styles.actionSlot}
                initial={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
                transition={
                  reduce
                    ? reducedFade
                    : { width: motionTokens.spring.smooth, opacity: fade }
                }
                onAnimationStart={() => markMoving(true)}
                onAnimationComplete={() => markMoving(false)}
              >
                <button
                  type="button"
                  className={styles.action}
                  onClick={runAction}
                >
                  {record.action.label}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Dismiss notification"
            onClick={() => store.dismiss(id)}
          >
            <X width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </motion.div>
      </motion.div>
    </motion.li>
  )
}

export function ToastStack({
  label = "Notifications",
  position = "top-right",
  contained = false,
  visibleToasts = 3,
  hotkey = true,
  className,
}: ToastStackProps) {
  const store = useStore()
  const toasts = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot
  )
  const reduce = !!useReducedMotion()
  const pageHidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "hidden",
    () => false
  )
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [tapped, setTapped] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const regionRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  if (tapped && toasts.length === 0) setTapped(false)
  const expanded = toasts.length > 0 && (hovered || focused || tapped)
  const paused = expanded || dragging || pageHidden
  const isTop = position.startsWith("top")

  const measure = useCallback((id: string, height: number) => {
    setHeights((current) =>
      current[id] === height ? current : { ...current, [id]: height }
    )
  }, [])

  const prune = useCallback(() => {
    setHeights((current) =>
      Object.fromEntries(
        store
          .getSnapshot()
          .filter((item) => item.id in current)
          .map((item) => [item.id, current[item.id]!])
      )
    )
  }, [store])

  const toggleTap = useCallback(() => setTapped((open) => !open), [])

  const handOff = useCallback((leaving: HTMLElement, keyboard: boolean) => {
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[]
    const at = items.indexOf(leaving)
    const candidates = items.filter(
      (item) => item !== leaving && !item.hasAttribute("inert")
    )
    const next =
      candidates.find((item) => items.indexOf(item) > at) ??
      candidates[candidates.length - 1]
    const button = next?.querySelector<HTMLElement>("button")
    if (keyboard && button) button.focus()
    else if (keyboard && returnFocus.current?.isConnected)
      returnFocus.current.focus()
    else (document.activeElement as HTMLElement | null)?.blur()
  }, [])

  useEffect(() => {
    if (!hotkey) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (
        !event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.code !== "KeyT"
      )
        return
      const target = listRef.current?.querySelector<HTMLElement>(
        ":scope > li:not([inert]) button"
      )
      if (!target) return
      event.preventDefault()
      target.focus({ focusVisible: true } as FocusOptions)
      setFocused(true)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [hotkey])

  useEffect(() => {
    if (!tapped) return
    const onDown = (event: PointerEvent) => {
      if (!regionRef.current?.contains(event.target as Node)) setTapped(false)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [tapped])

  const { targets, listHeight } = layoutStack(
    toasts,
    heights,
    expanded,
    visibleToasts,
    isTop
  )

  function onFocus(event: FocusEvent<HTMLElement>) {
    const from = event.relatedTarget
    if (!(from instanceof Node) || !event.currentTarget.contains(from)) {
      returnFocus.current = from instanceof HTMLElement ? from : null
    }
    if (focusVisible(event.target)) setFocused(true)
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setFocused(false)
    }
  }

  return (
    <section
      ref={regionRef}
      className={[
        styles.viewport,
        styles[position],
        contained && styles.contained,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={hotkey ? `${label} (Alt+T)` : label}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <ol
        ref={listRef}
        className={styles.list}
        style={{ height: listHeight }}
        data-expanded={expanded}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true)
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" && !hovered) setHovered(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHovered(false)
        }}
      >
        <AnimatePresence onExitComplete={prune}>
          {toasts.map((item, index) => (
            <ToastItem
              key={item.id}
              toast={item}
              target={targets[index]!}
              expanded={expanded}
              front={index === 0}
              hidden={index >= visibleToasts}
              paused={paused}
              reduce={reduce}
              isTop={isTop}
              store={store}
              onMeasure={measure}
              onDragChange={setDragging}
              onTap={toggleTap}
              onHandOff={handOff}
            />
          ))}
        </AnimatePresence>
      </ol>
    </section>
  )
}

export default ToastStack
