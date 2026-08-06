import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import type { ConfigDocument, ConfigSetting, SettingValue } from '@shared/types'
import { useT } from '../i18n'

interface ConfigEditorProps {
  path: string | null
  onClose: () => void
  onSaved: (message: string) => void
  onOpenExternally: (path: string) => void
}

export default function ConfigEditor({ path, onClose, onSaved, onOpenExternally }: ConfigEditorProps) {
  const t = useT()
  const [document, setDocument] = useState<ConfigDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, SettingValue>>({})
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (path === null) return

    setLoading(true)
    setEdits({})
    setError(null)
    setQuery('')

    let cancelled = false
    void window.api
      .readConfigFile(path)
      .then((result) => {
        if (!cancelled) setDocument(result)
      })
      .catch(() => {
        if (!cancelled) setError(t.configEditor.readFailed)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, t])

  const grouped = useMemo(() => {
    if (!document) return []
    const needle = query.trim().toLowerCase()

    const visible = document.settings.filter(
      (setting) =>
        needle === '' ||
        setting.label.toLowerCase().includes(needle) ||
        setting.key.toLowerCase().includes(needle) ||
        (setting.description ?? '').toLowerCase().includes(needle)
    )

    const sections = new Map<string, ConfigSetting[]>()
    for (const setting of visible) {
      const name = setting.section ?? ''
      if (!sections.has(name)) sections.set(name, [])
      sections.get(name)!.push(setting)
    }
    return [...sections.entries()]
  }, [document, query])

  const dirtyCount = Object.keys(edits).length

  const save = async (): Promise<void> => {
    if (!path || dirtyCount === 0) return

    setSaving(true)
    setError(null)
    try {
      const result = await window.api.writeConfigFile(
        path,
        Object.entries(edits).map(([key, value]) => ({ key, value }))
      )
      if (!result.ok) {
        setError(
          result.error ? t.configEditor.writeError[result.error] : t.configEditor.saveFailed
        )
        return
      }
      onSaved(t.configEditor.saved(dirtyCount))
      onClose()
    } catch {
      setError(t.configEditor.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={path !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {document?.fileName ?? t.configEditor.fallbackTitle}
        {dirtyCount > 0 && (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
            {t.configEditor.unsaved(dirtyCount)}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 320 }}>
        {loading && (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && document?.unsupportedReason && (
          <Stack spacing={2} sx={{ py: 4, alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t.configEditor.unsupported[document.unsupportedReason]}
            </Typography>
            <Button onClick={() => onOpenExternally(document.path)}>
              {t.configEditor.openInEditor}
            </Button>
          </Stack>
        )}

        {!loading && document && !document.unsupportedReason && (
          <Stack spacing={2}>
            <TextField
              size="small"
              placeholder={t.configEditor.searchOptions}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  )
                }
              }}
            />

            {grouped.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.configEditor.nothingMatchesSearch}
              </Typography>
            )}

            {grouped.map(([section, settings]) => (
              <Stack key={section || 'root'} spacing={1.5}>
                {section && (
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', pt: 1 }}>
                    {section}
                  </Typography>
                )}
                {settings.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    listHelperText={t.configEditor.onePerLine}
                    value={edits[setting.key] ?? setting.value}
                    onChange={(value) =>
                      setEdits((current) => {
                        const next = { ...current }

                        if (isSame(value, setting.value)) delete next[setting.key]
                        else next[setting.key] = value
                        return next
                      })
                    }
                  />
                ))}
                <Divider />
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {document && !document.unsupportedReason && (
          <Button onClick={() => onOpenExternally(document.path)} sx={{ mr: 'auto' }}>
            {t.configEditor.openAsText}
          </Button>
        )}
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button variant="contained" disabled={dirtyCount === 0 || saving} onClick={() => void save()}>
          {saving ? t.common.saving : t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface SettingRowProps {
  setting: ConfigSetting
  listHelperText: string
  value: SettingValue
  onChange: (value: SettingValue) => void
}

function SettingRow({ setting, listHelperText, value, onChange }: SettingRowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 260px' },
        gap: 2,
        alignItems: 'center'
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {setting.label}
        </Typography>
        {setting.description && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {setting.description}
          </Typography>
        )}
      </Box>

      <Box>
        <SettingControl
          setting={setting}
          listHelperText={listHelperText}
          value={value}
          onChange={onChange}
        />
      </Box>
    </Box>
  )
}

function SettingControl({ setting, listHelperText, value, onChange }: SettingRowProps) {
  if (setting.kind === 'boolean') {
    return (
      <Switch
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
        slotProps={{ input: { 'aria-label': setting.label } }}
      />
    )
  }

  if (setting.kind === 'enum' && setting.options) {
    return (
      <Select
        size="small"
        fullWidth
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      >
        {setting.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    )
  }

  if ((setting.kind === 'integer' || setting.kind === 'number') && hasUsableRange(setting)) {
    const step = setting.kind === 'integer' ? 1 : stepFor(setting.min!, setting.max!)
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Slider
          size="small"
          value={typeof value === 'number' ? value : 0}
          min={setting.min!}
          max={setting.max!}
          step={step}
          onChange={(_event, next) => onChange(next as number)}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          type="number"
          value={typeof value === 'number' ? value : 0}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(clamp(next, setting.min!, setting.max!))
          }}
          sx={{ width: 92 }}
        />
      </Stack>
    )
  }

  if (setting.kind === 'integer' || setting.kind === 'number') {
    return (
      <TextField
        size="small"
        fullWidth
        type="number"
        value={typeof value === 'number' ? value : 0}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(setting.kind === 'integer' ? Math.round(next) : next)
        }}
      />
    )
  }

  if (setting.kind === 'list') {
    return (
      <TextField
        size="small"
        fullWidth
        multiline
        maxRows={6}

        value={Array.isArray(value) ? value.join('\n') : ''}
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0)
          )
        }
        helperText={listHelperText}
      />
    )
  }

  return (
    <TextField size="small" fullWidth value={String(value)} onChange={(event) => onChange(event.target.value)} />
  )
}

function hasUsableRange(setting: ConfigSetting): boolean {
  if (setting.min === null || setting.max === null) return false
  if (!Number.isFinite(setting.min) || !Number.isFinite(setting.max)) return false

  return setting.max > setting.min && setting.max - setting.min <= 100_000
}

function stepFor(min: number, max: number): number {
  const span = max - min
  if (span <= 1) return 0.01
  if (span <= 10) return 0.1
  return 1
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isSame(a: SettingValue, b: SettingValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((entry, index) => entry === b[index])
  }
  return a === b
}
