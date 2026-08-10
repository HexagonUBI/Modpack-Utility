import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import SaveAltRounded from '@mui/icons-material/SaveAltRounded'
import type {
  Instance,
  ModsReport,
  ResourcePackReport,
  ShaderPackReport
} from '@shared/types'
import {
  EXPORT_EXTENSION,
  modEntry,
  packEntry,
  renderExport,
  shaderEntry,
  shrinkIcons,
  type ExportDocument,
  type ExportEntry,
  type ExportFormat,
  type ExportSection
} from '../export'
import { useT, type Messages } from '../i18n'

interface ExportDialogProps {
  open: boolean
  instance: Instance
  mods: ModsReport | null
  packs: ResourcePackReport | null
  shaders: ShaderPackReport | null
  onClose: () => void
  onDone: (pick: (t: Messages) => string) => void
}

interface Choice {
  mods: boolean
  packs: boolean
  shaders: boolean
}

export default function ExportDialog({
  open,
  instance,
  mods,
  packs,
  shaders,
  onClose,
  onDone
}: ExportDialogProps) {
  const t = useT()
  const [choice, setChoice] = useState<Choice>({ mods: true, packs: true, shaders: true })
  const [includeDisabled, setIncludeDisabled] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('html')
  const [busy, setBusy] = useState(false)
  const [icons, setIcons] = useState<Record<string, string>>({})

  const available = useMemo(
    () => ({
      mods: (mods?.mods ?? []).filter((mod) => includeDisabled || mod.enabled).map(modEntry),
      packs: (packs?.packs ?? []).filter((pack) => includeDisabled || pack.enabled).map(packEntry),
      shaders: (shaders?.packs ?? [])
        .filter((pack) => includeDisabled || pack.enabled)
        .map(shaderEntry)
    }),
    [mods, packs, shaders, includeDisabled]
  )

  useEffect(() => {
    if (!open) return

    let live = true
    const sources = [...(mods?.mods ?? []).map((mod) => mod.iconDataUrl), ...(packs?.packs ?? []).map((pack) => pack.iconDataUrl)]

    void shrinkIcons(sources).then((shrunk) => {
      if (live) setIcons(shrunk)
    })
    return () => {
      live = false
    }
  }, [open, mods, packs])

  const document = useMemo<ExportDocument>(() => {
    const shrink = (entries: ExportEntry[]): ExportEntry[] =>
      entries.map((entry) =>
        entry.iconDataUrl === null || icons[entry.iconDataUrl] === undefined
          ? entry
          : { ...entry, iconDataUrl: icons[entry.iconDataUrl]! }
      )

    const sections: ExportSection[] = []
    if (choice.mods) sections.push({ title: t.tabs.mods, entries: shrink(available.mods) })
    if (choice.packs) sections.push({ title: t.tabs.resourcePacks, entries: shrink(available.packs) })
    if (choice.shaders) sections.push({ title: t.export.shaderPacks, entries: available.shaders })

    return {
      title: instance.name,
      subtitle: describe(instance, t),
      generated: t.export.generatedOn(new Date().toLocaleDateString('en-CA')),
      sections
    }
  }, [choice, available, icons, instance, t])

  const total = document.sections.reduce((sum, section) => sum + section.entries.length, 0)

  const copy = async (): Promise<void> => {
    const text = renderExport(document, format, t)
    setBusy(true)
    try {
      await navigator.clipboard.writeText(text)
      onDone((messages) => messages.export.copied)
    } catch {
      onDone((messages) => messages.export.copyFailed)
    } finally {
      setBusy(false)
    }
  }

  const save = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await window.api.saveText({
        text: renderExport(document, format, t),
        fileName: `${fileStem(instance.name)}.${EXPORT_EXTENSION[format]}`,
        title: t.export.saveTitle,
        filterName: t.export.formats[format]
      })
      if (result.canceled) return
      onDone((messages) => messages.export.saved)
      onClose()
    } catch {
      onDone((messages) => messages.export.saveFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{t.export.title}</DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t.export.detail}
        </Typography>

        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Toggle
            label={t.tabs.mods}
            count={available.mods.length}
            checked={choice.mods}
            onChange={(next) => setChoice((current) => ({ ...current, mods: next }))}
          />
          <Toggle
            label={t.tabs.resourcePacks}
            count={available.packs.length}
            checked={choice.packs}
            onChange={(next) => setChoice((current) => ({ ...current, packs: next }))}
          />
          <Toggle
            label={t.export.shaderPacks}
            count={available.shaders.length}
            checked={choice.shaders}
            onChange={(next) => setChoice((current) => ({ ...current, shaders: next }))}
          />
        </Stack>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeDisabled}
              onChange={(event) => setIncludeDisabled(event.target.checked)}
            />
          }
          label={<Typography variant="body2">{t.export.includeDisabled}</Typography>}
        />

        <Divider />

        <Stack spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={format}
            onChange={(_event, next: ExportFormat | null) => next && setFormat(next)}
          >
            <ToggleButton value="html">{t.export.formats.html}</ToggleButton>
            <ToggleButton value="markdown">{t.export.formats.markdown}</ToggleButton>
            <ToggleButton value="text">{t.export.formats.text}</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t.export.formatHint[format]}
          </Typography>
        </Stack>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            maxHeight: 320,
            overflowY: 'auto'
          }}
        >
          {total === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
              {t.export.nothingSelected}
            </Typography>
          ) : (
            document.sections.map((section) =>
              section.entries.length === 0 ? null : (
                <Box key={section.title}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      position: 'sticky',
                      top: 0,
                      px: 1.5,
                      py: 0.75,
                      backgroundColor: 'background.paper',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {section.title} - {section.entries.length}
                  </Typography>
                  {section.entries.map((entry, index) => (
                    <Row key={`${section.title}-${entry.name}-${index}`} entry={entry} />
                  ))}
                </Box>
              )
            )
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button
          startIcon={<ContentCopyRounded />}
          disabled={busy || total === 0}
          onClick={() => void copy()}
        >
          {t.export.copy}
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveAltRounded />}
          disabled={busy || total === 0}
          onClick={() => void save()}
        >
          {t.export.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Row({ entry }: { entry: ExportEntry }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        px: 1.5,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      {entry.iconDataUrl ? (
        <Box
          component="img"
          src={entry.iconDataUrl}
          alt=""
          sx={{ width: 24, height: 24, borderRadius: 0.75, flexShrink: 0 }}
        />
      ) : (
        <Box
          sx={{ width: 24, height: 24, borderRadius: 0.75, backgroundColor: 'action.hover', flexShrink: 0 }}
        />
      )}

      <Typography
        variant="body2"
        noWrap
        sx={{ flex: 1, minWidth: 0, fontWeight: 600, color: entry.url ? 'primary.main' : 'text.primary' }}
      >
        {entry.name}
      </Typography>

      <Typography
        variant="caption"
        noWrap
        sx={{ width: 96, flexShrink: 0, color: 'text.secondary', fontFamily: 'ui-monospace, monospace' }}
      >
        {entry.version ?? ''}
      </Typography>

      <Typography variant="caption" noWrap sx={{ width: 200, flexShrink: 0, color: 'text.secondary' }}>
        {entry.authors.join(', ')}
      </Typography>
    </Stack>
  )
}

function Toggle({
  label,
  count,
  checked,
  onChange
}: {
  label: string
  count: number
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <FormControlLabel
      disabled={count === 0}
      control={<Checkbox checked={checked && count > 0} onChange={(event) => onChange(event.target.checked)} />}
      label={<Typography variant="body2">{`${label} (${count})`}</Typography>}
    />
  )
}

function describe(instance: Instance, t: Messages): string {
  const loader = instance.loader && instance.loader !== 'unknown' ? t.loaders[instance.loader] : null
  const parts = [instance.minecraftVersion, loader, t.launchers[instance.launcher]].filter(Boolean)
  return parts.join(' - ')
}

function fileStem(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : 'instance'
}
