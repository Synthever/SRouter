import useMediaQuery from "@/hooks/useMediaQuery"

/**
 * The inverse of Tailwind's `md` (768px), written as 767.98 so a fractional
 * viewport width cannot fall on the wrong side of both this query and `md:`.
 */
const BELOW_MD = "(max-width: 767.98px)"

/** Whether this viewport takes the sheet shell rather than the centred dialog. */
export default function useIsMobile() {
  return useMediaQuery(BELOW_MD)
}
