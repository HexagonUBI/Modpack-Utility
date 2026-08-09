import { createContext, useContext } from 'react'
import type { DeleteMode } from '@shared/types'

export const DeleteModeContext = createContext<DeleteMode>('recycle')

export function useDeleteMode(): DeleteMode {
  return useContext(DeleteModeContext)
}
